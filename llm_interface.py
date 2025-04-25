import yaml
import os
import time
import traceback

# --- LLM Client Libraries ---
# Ensure these are installed: pip install openai anthropic google-generativeai PyYAML
try:
    from openai import OpenAI, APIError, AuthenticationError as OpenAIAuthError
except ImportError:
    print("Warning: OpenAI library not installed. `pip install openai`")
    OpenAI = None
    APIError = None
    OpenAIAuthError = None

try:
    from anthropic import Anthropic, APIError as AnthropicAPIError, AuthenticationError as AnthropicAuthError
except ImportError:
    print("Warning: Anthropic library not installed. `pip install anthropic`")
    Anthropic = None
    AnthropicAPIError = None
    AnthropicAuthError = None

try:
    import google.generativeai as genai
    from google.api_core.exceptions import PermissionDenied as GoogleAuthError
    from google.generativeai.types import BlockedPromptException, GenerationConfig
    from google.generativeai.types.generation_types import StopCandidateException
except ImportError:
    print("Warning: Google Generative AI library not installed. `pip install google-generativeai`")
    genai = None
    GoogleAuthError = None
    BlockedPromptException = None
    StopCandidateException = None
# --- End LLM Libraries ---


CONFIG_FILE = 'config.yaml'

def load_config(config_path: str = CONFIG_FILE) -> dict | None:
    """Loads the YAML configuration file."""
    if not os.path.exists(config_path):
        print(f"Error: Configuration file '{config_path}' not found.")
        print("Please create it based on the example structure.")
        return None
    try:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
            # Basic validation
            required_keys = ['iterations', 'api_keys', 'attacker_model', 'defender_model']
            if not all(key in config for key in required_keys):
                print(f"Error: Config file '{config_path}' is missing required keys.")
                print(f"Required keys are: {', '.join(required_keys)}")
                return None
            if not isinstance(config.get('iterations'), int) or config['iterations'] <= 0:
                 print(f"Error: 'iterations' in config must be a positive integer.")
                 return None
            # Further validation can be added here (e.g., checking model provider names)
            return config
    except yaml.YAMLError as e:
        print(f"Error parsing configuration file '{config_path}': {e}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred while loading config: {e}")
        return None

def get_llm_client(provider: str, api_key: str, model_name: str | None = None):
    """Initializes and returns an LLM client based on the provider.

    Args:
        provider (str): The name of the LLM provider (e.g., 'openai', 'anthropic', 'google').
        api_key (str): The API key for the provider.
        model_name (str | None): The model name, required for some providers like Google Gemini.


    Returns:
        An instance of the LLM client or model object.
        Returns None if the library is not installed or initialization fails.

    Raises:
        ValueError: If the provider is not supported.
        ImportError: If the required library is not installed.
        # Specific authentication or API errors from the libraries.
    """
    print(f"--- Initializing client for provider: {provider} ---")

    if provider == 'openai':
        if not OpenAI:
            raise ImportError("OpenAI library is not installed.")
        try:
            return OpenAI(api_key=api_key)
        except OpenAIAuthError as e:
            print(f"OpenAI Authentication Error: {e}")
            raise
        except Exception as e:
            print(f"Failed to initialize OpenAI client: {e}")
            raise
    elif provider == 'anthropic':
        if not Anthropic:
            raise ImportError("Anthropic library is not installed.")
        try:
            return Anthropic(api_key=api_key)
        except AnthropicAuthError as e:
            print(f"Anthropic Authentication Error: {e}")
            raise
        except Exception as e:
            print(f"Failed to initialize Anthropic client: {e}")
            raise
    elif provider == 'google':
        if not genai:
            raise ImportError("Google Generative AI library is not installed.")
        if not model_name:
            raise ValueError("Model name is required for Google Gemini client initialization.")
        try:
            genai.configure(api_key=api_key)
            # Return the specific model instance
            return genai.GenerativeModel(model_name)
        except GoogleAuthError as e:
            print(f"Google Gemini Authentication Error: {e}")
            raise
        except Exception as e:
            print(f"Failed to initialize Google Gemini client (Model: {model_name}): {e}")
            raise
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")


def _format_history_openai_anthropic(history: list[str]) -> list[dict[str, str]]:
    """Formats simple string history into OpenAI/Anthropic message format."""
    messages = []
    for i, entry in enumerate(history):
        # Simple assumption: Even entries are prompts (user), odd are responses (assistant)
        # This might need adjustment based on how history is stored in interaction_handler
        if entry.startswith("Attacker Prompt:") or entry.startswith("User Prompt:"):
            role = "user"
            content = entry.split(":", 1)[1].strip()
        elif entry.startswith("Defender Response:") or entry.startswith("Assistant Response:"):
            role = "assistant"
            content = entry.split(":", 1)[1].strip()
        else:
            # Fallback or skip unknown entries
            print(f"Warning: Skipping unknown history entry format: {entry[:50]}...")
            continue
        messages.append({"role": role, "content": content})
    return messages

def _format_history_google(history: list[str]) -> list[dict[str, str]]:
    """Formats simple string history into Google Gemini message format."""
    # Gemini expects alternating 'user' and 'model' roles.
    messages = []
    expected_role = "user"
    for entry in history:
        role = None
        content = entry.split(":", 1)[1].strip() if ":" in entry else entry

        if entry.startswith("Attacker Prompt:") or entry.startswith("User Prompt:"):
            role = "user"
        elif entry.startswith("Defender Response:") or entry.startswith("Assistant Response:"):
            role = "model" # Google uses 'model' for assistant
        else:
             print(f"Warning: Skipping unknown history entry format for Google: {entry[:50]}...")
             continue

        if role == expected_role:
            messages.append({"role": role, "content": content})
            expected_role = "model" if role == "user" else "user"
        else:
            # Attempt to recover if roles are slightly off, e.g., back-to-back user prompts
            # might happen if analysis prompts are added. This is a simple fix.
            print(f"Warning: History role mismatch for Google. Expected '{expected_role}', got '{role}'. Adjusting.")
            if role == "user":
                 # Insert a dummy model response if we get two user prompts in a row
                 if messages and messages[-1]['role'] == 'user':
                     messages.append({"role": "model", "content": "[Previous turn context placeholder]"})
                 messages.append({"role": "user", "content": content})
                 expected_role = "model"
            elif role == "model":
                 # If we get a model response unexpectedly, just add it and expect user next.
                 messages.append({"role": "model", "content": content})
                 expected_role = "user"

    # Ensure the history ends with a state ready for a user prompt (if needed for generate_content)
    # Usually, generate_content takes the *new* prompt separately.
    # If the last message was 'user', it might cause issues if the API expects 'model' first/alternating.
    # Let's ensure it starts with 'user' if not empty
    if messages and messages[0]['role'] != 'user':
         print("Warning: Google history doesn't start with 'user'. Prepending placeholder.")
         messages.insert(0, {"role": "user", "content": "[Initial context placeholder]"})
         # Re-check alternation after insert if necessary

    return messages


def generate_response(client: object | None, model_config: dict, prompt: str, history: list[str] | None = None) -> str:
    """Generates a response from the specified LLM, handling real APIs and simulation.

    Args:
        client: The initialized LLM client/model object, or None for simulation.
        model_config: Configuration dict for the model (provider, model_name, temperature, etc.).
        prompt: The input prompt for the LLM.
        history: List of previous interaction strings for context.

    Returns:
        The LLM's generated response as a string, or an error message.
    """
    provider = model_config.get('provider', 'unknown')
    model_name = model_config.get('model_name', 'unknown_model')
    temperature = model_config.get('temperature') # Optional temperature
    max_tokens = model_config.get('max_tokens') # Optional max_tokens (esp. for Anthropic)

    history = history or []

    if client is None:
        # --- Simulation Mode --- #
        print(f"--- Simulating response from {provider}/{model_name} (No API Key/Client) ---")
        time.sleep(0.5)
        role = model_config.get("role", "unknown") # Get role from config if set
        if role == "attacker":
            simulated_prompt = f"Simulated honeypot (from {model_name}): How to bypass X?"
            print(f"Simulated Attacker Prompt: {simulated_prompt}")
            return simulated_prompt
        else: # Assume defender or unknown
            simulated_response = f"Simulated safe response (from {model_name}): I cannot help with that due to safety guidelines."
            if "explain" in prompt.lower() or "reasoning" in prompt.lower():
                 simulated_response += "\nMy reasoning: It violates policy Z."
            print(f"Simulated Defender Response: {simulated_response}")
            return simulated_response
    else:
        # --- Actual LLM Call --- #
        print(f"--- Generating response from {provider}/{model_name} ---")
        try:
            if provider == 'openai' and OpenAI and isinstance(client, OpenAI):
                formatted_history = _format_history_openai_anthropic(history)
                messages = formatted_history + [{"role": "user", "content": prompt}]
                api_params = {"model": model_name, "messages": messages}
                if temperature is not None: api_params["temperature"] = temperature
                if max_tokens is not None: api_params["max_tokens"] = max_tokens # OpenAI also supports max_tokens

                response = client.chat.completions.create(**api_params)
                return response.choices[0].message.content.strip()

            elif provider == 'anthropic' and Anthropic and isinstance(client, Anthropic):
                formatted_history = _format_history_openai_anthropic(history)
                # Anthropic requires max_tokens
                if max_tokens is None:
                    print("Warning: max_tokens not set for Anthropic, defaulting to 1024.")
                    max_tokens = 1024

                # Anthropic API has slightly different message structure handling sometimes
                # Ensure history doesn't end with assistant? Or handle within API call structure.
                # The messages.create structure is often: system prompt + messages list
                api_params = {"model": model_name, "max_tokens": max_tokens, "messages": formatted_history + [{"role": "user", "content": prompt}]}
                if temperature is not None: api_params["temperature"] = temperature
                # Add system prompt if defined in config?
                # if 'system_prompt' in model_config: api_params['system'] = model_config['system_prompt']

                response = client.messages.create(**api_params)
                # Response structure is different: response.content is a list of blocks
                response_text = ""
                if response.content and isinstance(response.content, list):
                     response_text = "".join(block.text for block in response.content if hasattr(block, 'text'))
                elif hasattr(response, 'completion'): # Older Anthropic API? Unlikely needed now.
                     response_text = response.completion
                return response_text.strip()


            elif provider == 'google' and genai and isinstance(client, genai.GenerativeModel):
                formatted_history = _format_history_google(history)
                # Google's generate_content handles history internally if passed to start_chat
                # Or you can send the prompt directly. Sending prompt directly is simpler here.
                # History formatting is crucial for context.
                # Let's try using start_chat for better context management.

                chat = client.start_chat(history=formatted_history)
                # GenerationConfig allows setting temp, max_tokens etc.
                gen_config_params = {}
                if temperature is not None: gen_config_params["temperature"] = temperature
                if max_tokens is not None: gen_config_params["max_output_tokens"] = max_tokens
                generation_config = GenerationConfig(**gen_config_params) if gen_config_params else None

                safety_settings = model_config.get('safety_settings') # Allow custom safety settings

                response = chat.send_message(
                    prompt,
                    generation_config=generation_config,
                    safety_settings=safety_settings
                    )
                # Accessing response text, handling potential blocks
                if response.parts:
                    return response.text.strip()
                elif response.candidates and response.candidates[0].finish_reason == 'SAFETY':
                     print("Warning: Google Gemini blocked the response due to safety settings.")
                     return "[Blocked By Safety Filter]"
                else:
                     # Maybe blocked prompt or other issue?
                     print(f"Warning: Google Gemini returned no text parts. Response: {response}")
                     return "[No Content Received]"

            else:
                # This case should ideally not be reached if get_llm_client worked
                # but the client object is not of the expected type.
                 return f"Error: Client object is not a recognized type for provider {provider}."


        # --- Error Handling --- #
        except (APIError, AnthropicAPIError) as e: # General API errors (rate limits, server issues)
            print(f"Error during API call to {provider}/{model_name}: {e}")
            traceback.print_exc()
            return f"Error: API call failed for {provider}. Details: {e}"
        except (OpenAIAuthError, AnthropicAuthError, GoogleAuthError) as e: # Auth errors
            print(f"Authentication Error for {provider}: {e}")
            traceback.print_exc()
            return f"Error: Authentication failed for {provider}. Check API key."
        except BlockedPromptException as e: # Google specific
             print(f"Google Gemini blocked the prompt: {e}")
             return "[Prompt Blocked By Safety Filter]"
        except StopCandidateException as e: # Google specific, often safety related
             print(f"Google Gemini stopped generation, potentially due to safety: {e}")
             # Attempt to get partial text if available? Usually response.text handles this.
             try:
                 return e.response.text.strip() + " [Generation Stopped]"
             except Exception:
                 return "[Generation Stopped Abruptly]"
        except ImportError as e:
            print(f"Import Error: {e}. Make sure the required library for {provider} is installed.")
            return f"Error: Missing library for {provider}."
        except Exception as e: # Catch-all for other unexpected errors
            print(f"An unexpected error occurred during API call to {provider}/{model_name}: {e}")
            traceback.print_exc()
            return f"Error: An unexpected error occurred with {provider}. Check logs." 