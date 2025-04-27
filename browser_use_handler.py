import os
import asyncio
import subprocess
import json
from dotenv import load_dotenv
from browser_use import Agent
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

# Load environment variables from .env file
load_dotenv()

def ensure_playwright_installed():
    """
    Ensures that Playwright browsers are installed.
    Returns True if installation was successful or already installed.
    """
    try:
        # Try to install Playwright browsers
        subprocess.run(["playwright", "install", "chromium"], check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Failed to install Playwright browsers: {e}")
        return False
    except FileNotFoundError:
        print("Playwright command not found. Make sure Playwright is installed.")
        return False

# Function to process browser use requests
async def run_browser_use_agent(url, prompt, provider='openai'):
    """
    Run a browser-use agent to interact with a website based on a prompt.
    
    Args:
        url (str): The URL of the website to interact with
        prompt (str): The instruction prompt for the agent
        provider (str): The LLM provider to use ('openai' or 'anthropic')
        
    Returns:
        dict: Result of the browser interaction
    """
    try:
        # Ensure Playwright is installed
        if not ensure_playwright_installed():
            return {
                "success": False,
                "error": "Failed to install Playwright browsers. Please run 'playwright install' manually.",
                "provider": provider
            }
            
        # Select the appropriate LLM based on provider
        if provider == 'anthropic':
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                return {"error": "ANTHROPIC_API_KEY is not set in environment variables"}
            
            llm = ChatAnthropic(
                model="claude-3-opus-20240229",
                anthropic_api_key=api_key
            )
        else:  # Default to OpenAI
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                return {"error": "OPENAI_API_KEY is not set in environment variables"}
            
            llm = ChatOpenAI(
                model="gpt-4o",
                openai_api_key=api_key
            )
        
        # Create the Browser Use agent according to the latest API
        # The task should include both the prompt and the URL to visit
        task = f"Visit {url} and {prompt}"
        agent = Agent(
            task=task,  # Task includes both the prompt and URL
            llm=llm       # Pass the LLM instance
        )
        
        # Run the agent - per documentation, the run() method is now used
        # and the URL is included in the task
        result = await agent.run()
        
        # Extract relevant data from the AgentHistoryList to make it JSON serializable
        serialized_result = {
            "final_result": result.final_result() if hasattr(result, "final_result") and callable(result.final_result) else None,
            "visited_urls": result.urls() if hasattr(result, "urls") and callable(result.urls) else [],
            "actions": result.action_names() if hasattr(result, "action_names") and callable(result.action_names) else [],
            "content": result.extracted_content() if hasattr(result, "extracted_content") and callable(result.extracted_content) else {},
            "is_done": result.is_done() if hasattr(result, "is_done") and callable(result.is_done) else False,
            "has_errors": result.has_errors() if hasattr(result, "has_errors") and callable(result.has_errors) else False,
        }
        
        # Return the result
        return {
            "success": True,
            "result": serialized_result,
            "provider": provider
        }
    
    except Exception as e:
        # Return error information if something goes wrong
        return {
            "success": False,
            "error": str(e),
            "provider": provider
        }

# Synchronous wrapper for the async function to be called from Flask
def browser_use_interaction(url, prompt, provider='openai'):
    """
    Synchronous wrapper for run_browser_use_agent.
    
    Args:
        url (str): The URL of the website to interact with
        prompt (str): The instruction prompt for the agent
        provider (str): The LLM provider to use ('openai' or 'anthropic')
        
    Returns:
        dict: Result of the browser interaction
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(run_browser_use_agent(url, prompt, provider))
        return result
    finally:
        loop.close()

# For testing the module directly
if __name__ == "__main__":
    # Example usage
    test_url = "https://www.example.com"
    test_prompt = "Summarize the content of this webpage."
    
    result = browser_use_interaction(test_url, test_prompt)
    print(result) 