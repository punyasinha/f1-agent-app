import ChatInterface from "@/components/ChatInterface";

export default function Home() {
  return (
    <main className="flex h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl flex flex-col h-full py-8">
        <h1 className="text-2xl font-bold text-red-500 mb-2">F1 Data Agent</h1>
        <p className="text-gray-400 text-sm mb-6">
          Ask anything about Formula 1 history — drivers, races, constructors, results.
        </p>
        <ChatInterface />
      </div>
    </main>
  );
}
