import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Mic, MicOff, Send, Bot, Brain, Search, Code, FileText } from 'lucide-react';

const JarvisAgent = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  // Available AI agents
  const aiAgents = [
    { id: 'general', name: 'General Assistant', icon: Bot, color: 'from-blue-500 to-cyan-500' },
    { id: 'research', name: 'Research Agent', icon: Search, color: 'from-purple-500 to-pink-500' },
    { id: 'code', name: 'Code Assistant', icon: Code, color: 'from-green-500 to-emerald-500' },
    { id: 'creative', name: 'Creative Writer', icon: FileText, color: 'from-orange-500 to-red-500' },
    { id: 'analysis', name: 'Data Analyst', icon: Brain, color: 'from-indigo-500 to-purple-500' },
  ];

  // Generate stable random positions for background elements
  const backgroundElements = useMemo(() => {
    return [...Array(50)].map((_, i) => ({
      id: i,
      width: Math.random() * 200 + 50,
      height: Math.random() * 200 + 50,
      left: Math.random() * 100,
      top: Math.random() * 100,
      animationDelay: Math.random() * 5,
      animationDuration: Math.random() * 10 + 5
    }));
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          }
        }
        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    // Initialize speech synthesis
    synthRef.current = window.speechSynthesis;
  }, []);

  // Fetch and set voices
  useEffect(() => {
    const synth = window.speechSynthesis;
    
    const populateVoiceList = () => {
      const availableVoices = synth.getVoices();
      setVoices(availableVoices);

      // Set a default voice if one isn't already selected.
      setSelectedVoice(currentSelectedVoice => {
        if (!currentSelectedVoice && availableVoices.length > 0) {
          const defaultVoice = availableVoices.find(voice => voice.name.includes('Google') && voice.lang.startsWith('en')) || availableVoices.find(voice => voice.lang.startsWith('en-US')) || availableVoices[0];
          return defaultVoice ? defaultVoice.voiceURI : null;
        }
        return currentSelectedVoice;
      });
    };

    // Voices can load asynchronously.
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = populateVoiceList;
    }
    
    populateVoiceList(); // Initial call
  }, []);

  // Analyze query and route to appropriate agent
  const analyzeAndRoute = (query) => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('code') || lowerQuery.includes('programming') || lowerQuery.includes('debug')) {
      return aiAgents.find(a => a.id === 'code');
    } else if (lowerQuery.includes('research') || lowerQuery.includes('search') || lowerQuery.includes('find')) {
      return aiAgents.find(a => a.id === 'research');
    } else if (lowerQuery.includes('write') || lowerQuery.includes('story') || lowerQuery.includes('creative')) {
      return aiAgents.find(a => a.id === 'creative');
    } else if (lowerQuery.includes('analyze') || lowerQuery.includes('data') || lowerQuery.includes('statistics')) {
      return aiAgents.find(a => a.id === 'analysis');
    }
    
    return aiAgents.find(a => a.id === 'general');
  };

  // Handle voice input
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      if (transcript) {
        handleSubmit(transcript);
      }
    } else {
      setTranscript('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  // Speak response
  const speak = (text) => {
    if (synthRef.current) {
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = voices.find(v => v.voiceURI === selectedVoice);
      if (voice) {
        utterance.voice = voice;
      }
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      synthRef.current.speak(utterance);
    }
  };

  // Handle message submission
  const handleSubmit = async (text) => {
    if (!text.trim()) return;

    const agent = analyzeAndRoute(text);
    setSelectedAgent(agent);
    setIsProcessing(true);

    const userMessage = {
      id: Date.now(),
      text,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setTranscript('');

    // Simulate AI processing
    setTimeout(() => {
      const response = {
        id: Date.now() + 1,
        text: `I've routed your request to the ${agent.name}. Processing your query: "${text}"`,
        sender: 'ai',
        agent: agent.name,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessages(prev => [...prev, response]);
      speak(response.text);
      setIsProcessing(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
        <div className="absolute inset-0">
          {backgroundElements.map((element) => (
            <div
              key={element.id}
              className="absolute bg-blue-500/10 rounded-full blur-xl animate-pulse"
              style={{
                width: element.width + 'px',
                height: element.height + 'px',
                left: element.left + '%',
                top: element.top + '%',
                animationDelay: element.animationDelay + 's',
                animationDuration: element.animationDuration + 's'
              }}
            />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <div className="p-6 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            JARVIS AI Assistant
          </h1>
          <p className="text-gray-400 mt-2">Voice-activated intelligent routing system</p>
        </div>

        {/* Voice Selector */}
        <div className="w-full max-w-md mx-auto mb-4">
          <label htmlFor="voice-select" className="block mb-2 text-sm font-medium text-gray-300">Assistant's Voice</label>
          <select
            id="voice-select"
            value={selectedVoice || ''}
            onChange={(e) => setSelectedVoice(e.target.value)}
            className="bg-gray-800 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2.5"
          >
            {voices.length > 0 ? (
              voices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {`${voice.name} (${voice.lang})`}
                </option>
              ))
            ) : (
              <option value="" disabled>Loading voices...</option>
            )}
          </select>
        </div>

        {/* Central visualization */}
        <div className="flex-1 flex items-center justify-center relative">
          <div className="relative">
            {/* Main circle */}
            <div className={`
              w-64 h-64 rounded-full relative transition-all duration-300
              ${isListening || isSpeaking ? 'scale-110' : 'scale-100'}
            `}>
              {/* Outer rings */}
              <div className={`
                absolute inset-0 rounded-full border-2 border-cyan-400/30
                ${isListening || isSpeaking ? 'animate-ping' : ''}
              `} />
              <div className={`
                absolute inset-0 rounded-full border-2 border-blue-400/20
                ${isListening || isSpeaking ? 'animate-ping animation-delay-200' : ''}
              `} />
              
              {/* Inner circle with gradient */}
              <div className={`
                absolute inset-2 rounded-full bg-gradient-to-br 
                ${selectedAgent ? selectedAgent.color : 'from-gray-700 to-gray-800'} 
                flex items-center justify-center shadow-lg
              `}>
                <button 
                  onClick={toggleListening} 
                  className="w-48 h-48 rounded-full bg-black/20 flex items-center justify-center text-white/80 hover:text-white transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50"
                >
                  {isListening ? <MicOff size={60} className="animate-pulse" /> : <Mic size={60} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Message display area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-lg p-3 rounded-lg ${msg.sender === 'user' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                <p className="text-sm">{msg.text}</p>
                <p className="text-xs text-gray-400 mt-1 text-right">{msg.timestamp}</p>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="max-w-lg p-3 rounded-lg bg-gray-700 animate-pulse">
                <p className="text-sm">...</p>
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="p-6">
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(inputText); }} className="flex items-center bg-gray-900/50 border border-gray-700 rounded-full p-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isListening ? 'Listening...' : 'Type your message or use the mic'}
              className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none px-4"
              disabled={isListening}
            />
            <button type="submit" className="bg-blue-500 hover:bg-blue-600 rounded-full p-3 text-white transition-colors duration-300" disabled={isProcessing}>
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default JarvisAgent;