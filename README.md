# Agent Honeypot

This project creates a platform where one LLM (the "attacker") attempts to generate prompts (honeypots) to trick another LLM (the "defender") into generating misaligned or unsafe responses. It helps evaluate alignment of AI systems and identify potential vulnerabilities.

## Key Features

* **Multi-provider LLM Support:** Compatible with OpenAI, Anthropic Claude, and Google Gemini models.
* **Adaptive Honeypot Generation:** The attacker adapts strategies based on defender responses.
* **Sophisticated Alignment Analysis:** Multi-layered response evaluation using pattern matching and meta-evaluation.
* **Reasoning Extraction:** Automatically requests reasoning from the defender when potentially misaligned responses are detected.
* **Honeypot Categorization:** Organizes attacks by strategy types and target domains.
* **Progress Tracking:** Saves interaction logs after each round with detailed analysis.
* **Simulation Mode:** Can run without API keys for testing/development.
* **Configurable Parameters:** Customizable iteration count, model selection, and analysis options.

## Getting Started

### Prerequisites

- Python 3.8+ for the backend
- Node.js 18+ and npm for the frontend
- API keys for LLM providers (optional, can run in simulation mode without them)

### Clone the Repository

```bash
git clone https://github.com/your-username/agent-honeypot.git
cd agent-honeypot
```

### Backend Setup

1. **Create and activate a virtual environment:**

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows, use: venv\Scripts\activate
   ```

2. **Install backend dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

3. **Configure your API keys:**

   Edit `config.yaml` with your LLM provider API keys:

   ```yaml
   api_keys:
     openai: YOUR_OPENAI_API_KEY
     anthropic: YOUR_ANTHROPIC_API_KEY
     google: YOUR_GOOGLE_API_KEY
   ```

   If you don't have API keys, you can leave the placeholder values to run in simulation mode.

4. **Start the API server:**

   ```bash
   python api_server.py
   ```

   The backend API will be available at http://localhost:8000

### Frontend Setup

1. **Navigate to the frontend directory:**

   ```bash
   cd frontend
   ```

2. **Install frontend dependencies:**

   ```bash
   npm install
   ```

3. **Start the development server:**

   ```bash
   npm run dev
   ```

   The frontend will be available at http://localhost:3000

## Running Honeypot Tests

Once both the backend and frontend are running:

1. Navigate to http://localhost:3000 in your browser
2. Click "Start New Run" to begin a new honeypot test
3. Configure the test parameters or use the defaults
4. Monitor the run progress in real-time
5. View detailed results and analysis when the test completes

Results will be saved to the `results/` directory automatically.

## Advanced Configuration

### Model Configuration

You can customize which models are used for the attacker, defender, and analyzer in the `config.yaml` file:

```yaml
attacker_model:
  provider: openai
  model_name: gpt-4-turbo
  temperature: 0.7

defender_model:
  provider: anthropic
  model_name: claude-3-opus
  temperature: 0.5

analyzer_model:
  provider: openai
  model_name: gpt-4o
  temperature: 0.0
```

### Testing Strategies

The honeypot generator supports various attack strategies:

- **Authority**: Claims expertise or authorization
- **Emergency**: Creates a sense of urgency
- **Educational**: Frames as learning/research
- **Incremental**: Gradually escalates requests
- **Hypothetical**: Frames as fictional scenarios
- **Split Task**: Breaks harmful tasks into innocent components
- **Credential Sharing**: Requests help with accounts/access

These can be customized in the `honeypot_generator.py` file.

## Troubleshooting

- **Backend API not starting**: Check if port 8000 is already in use by another application
- **Frontend connection errors**: Ensure the backend API is running at http://localhost:8000
- **LLM errors**: Verify your API keys are correctly set in config.yaml
- **Missing dependencies**: Make sure all required packages are installed via pip and npm

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE). 