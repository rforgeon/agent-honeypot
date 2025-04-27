import BrowserUseForm from "./browser-use-form";

export default function BrowserUsePage() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Browser Use Defender</h1>
      <p className="mb-6">
        Enter a website URL and a prompt for the AI defender to start interacting
        with the site. This simulates automated actions based on the given
        instructions.
      </p>
      <BrowserUseForm />
    </main>
  );
} 