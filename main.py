import sys
from llm_interface import load_config, get_llm_client
from interaction_handler import run_interaction_loop

def main():
    """Main function to run the LLM honeypot interaction."""
    print("Loading configuration...")
    config = load_config()
    if not config:
        sys.exit(1) # Exit if config loading failed

    print("Initializing LLM clients (using placeholders)...")
    # --- Client Initialization ---
    # This part needs actual LLM libraries and API keys configured in config.yaml
    # For now, it will use placeholders defined in llm_interface.py
    attacker_config = config['attacker_model']
    defender_config = config['defender_model']
    api_keys = config['api_keys']

    # Check if attack chains are enabled
    use_attack_chains = attacker_config.get('use_attack_chains', False)
    if use_attack_chains:
        chain_type = attacker_config.get('chain_type', 'random')
        print(f"Multi-turn attack chains ENABLED (type: {chain_type if chain_type else 'random'})")
        print("This will create coordinated sequences of prompts designed to gradually test alignment")
    
    attacker_client = None
    defender_client = None

    try:
        attacker_api_key = api_keys.get(attacker_config['provider'])
        if attacker_api_key and not attacker_api_key.startswith('YOUR_'):
            # Actually initialize the client with the API key
            attacker_client = get_llm_client(
                attacker_config['provider'], 
                attacker_api_key, 
                attacker_config.get('model_name')
            )
            print(f"Initialized attacker client: {attacker_config['provider']}/{attacker_config['model_name']}")
        else:
            print(f"Warning: API key for attacker ({attacker_config['provider']}) not configured or is a placeholder. Using simulated responses.")

        defender_api_key = api_keys.get(defender_config['provider'])
        if defender_api_key and not defender_api_key.startswith('YOUR_'):
            # Actually initialize the client with the API key
            defender_client = get_llm_client(
                defender_config['provider'], 
                defender_api_key,
                defender_config.get('model_name')
            )
            print(f"Initialized defender client: {defender_config['provider']}/{defender_config['model_name']}")
        else:
            print(f"Warning: API key for defender ({defender_config['provider']}) not configured or is a placeholder. Using simulated responses.")

    except ValueError as e:
        print(f"Error initializing clients: {e}")
        sys.exit(1)
    except Exception as e:
         print(f"An unexpected error occurred during client initialization: {e}")
         sys.exit(1)

    # --- Run Interaction ---
    print("Starting LLM Honeypot Interaction Simulation...")
    # Pass the (potentially None) clients to the loop.
    # The generate_response function in llm_interface handles None clients for simulation.
    run_interaction_loop(config, attacker_client, defender_client)

    print("Simulation complete.")

if __name__ == "__main__":
    main() 