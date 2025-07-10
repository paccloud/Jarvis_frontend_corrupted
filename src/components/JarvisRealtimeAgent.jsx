import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Mic, MicOff, Send, Bot, Brain, Search, Code, FileText, Phone, PhoneOff } from 'lucide-react';

const JarvisRealtimeAgent = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('general');
  const [availableAgents, setAvailableAgents] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [sessionData, setSessionData] = useState(null);
  
  const pcRef = useRef(null);
  const dataChannelRef = useRef(null);
  const audioContextRef = useRef(null);
  const microphoneStreamRef = useRef(null);
  
  // Backend API configuration
  const API_BASE = import.meta.env.VITE_REALTIME_API_BASE_URL || 'http://localhost:5051/api';

  // Available AI agents
  const aiAgents = [
    { id: 'general', name: 'General Assistant', icon: Brain, color: 'from-indigo-500 to-purple-500' },
    { id: 'financial', name: 'Financial Assistant', icon: Bot, color: 'from-green-500 to-emerald-500' },
    { id: 'tasks', name: 'Task Organizer', icon: FileText, color: 'from-blue-500 to-cyan-500' },
    { id: 'email', name: 'Email Assistant', icon: Send, color: 'from-purple-500 to-pink-500' },
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

  // Initialize audio context
  useEffect(() => {
    const initAudioContext = async () => {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (error) {
        console.error('Failed to initialize audio context:', error);
      }
    };
    
    initAudioContext();
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Create realtime session
  const createRealtimeSession = async () => {
    try {
      setIsConnecting(true);
      setConnectionStatus('connecting');
      
      const response = await fetch(`${API_BASE}/realtime/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: selectedAgent })
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status}`);
      }

      const data = await response.json();
      setSessionData(data);
      setAvailableAgents(data.availableAgents || []);
      
      return data;
    } catch (error) {
      console.error('Error creating realtime session:', error);
      setConnectionStatus('error');
      throw error;
    }
  };

  // Setup WebRTC connection
  const setupWebRTC = async (sessionData) => {
    try {
      // Create peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Add audio track
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStreamRef.current = stream;
      
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Create data channel for events
      const dataChannel = pc.createDataChannel('oai-events');
      dataChannelRef.current = dataChannel;

      dataChannel.onopen = () => {
        console.log('Data channel opened');
        setIsConnected(true);
        setConnectionStatus('connected');
        
        // Send session configuration
        dataChannel.send(JSON.stringify({
          type: 'session.update',
          session: {
            instructions: sessionData.instructions || 'You are JARVIS, a helpful AI assistant.',
            voice: 'verse',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 200
            },
            tools: sessionData.tools || [],
            tool_choice: 'auto',
            temperature: 0.7,
            max_response_output_tokens: 4096
          }
        }));
      };

      dataChannel.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleRealtimeEvent(message);
        } catch (error) {
          console.error('Error parsing data channel message:', error);
        }
      };

      dataChannel.onerror = (error) => {
        console.error('Data channel error:', error);
        setConnectionStatus('error');
      };

      // Handle incoming audio
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.play().catch(console.error);
      };

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to OpenAI
      const response = await fetch(`https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.client_secret.value}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });

      if (!response.ok) {
        throw new Error(`WebRTC setup failed: ${response.status}`);
      }

      const answerSdp = await response.text();
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });

    } catch (error) {
      console.error('WebRTC setup error:', error);
      setConnectionStatus('error');
      throw error;
    }
  };

  // Handle realtime events
  const handleRealtimeEvent = (event) => {
    console.log('Realtime event:', event);
    
    switch (event.type) {
      case 'conversation.item.created':
        if (event.item.type === 'message') {
          const message = {
            id: event.item.id,
            text: event.item.content?.[0]?.text || '',
            sender: event.item.role === 'user' ? 'user' : 'ai',
            agent: selectedAgent,
            timestamp: new Date().toLocaleTimeString()
          };
          setMessages(prev => [...prev, message]);
        }
        break;
        
      case 'response.audio_transcript.delta':
        // Update the last AI message with transcript
        setMessages(prev => {
          const updated = [...prev];
          const lastMessage = updated[updated.length - 1];
          if (lastMessage && lastMessage.sender === 'ai') {
            lastMessage.text += event.delta;
          }
          return updated;
        });
        break;
        
      case 'response.audio.delta':
        // Audio is being played automatically via WebRTC
        setIsSpeaking(true);
        break;
        
      case 'response.done':
        setIsSpeaking(false);
        break;
        
      case 'input_audio_buffer.speech_started':
        setIsListening(true);
        break;
        
      case 'input_audio_buffer.speech_stopped':
        setIsListening(false);
        break;
        
      case 'tool_calls':
        // Handle tool calls
        const toolPromises = event.tool_calls.map(async (toolCall) => {
          const { toolName, arguments: toolArgs } = toolCall.function;
          
          // Call your backend to execute the tool
          const response = await fetch(`${API_BASE}/realtime/tools`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ toolName, arguments: toolArgs })
          });
          
          const result = await response.json();
          
          // Send tool output back to OpenAI
          dataChannelRef.current.send(JSON.stringify({
            type: 'tool_outputs',
            tool_outputs: [{
              tool_call_id: toolCall.id,
              output: JSON.stringify(result)
            }]
          }));
        });
        
        Promise.all(toolPromises).catch(error => {
          console.error('Error handling tool calls:', error);
        });
        break;
        
      case 'error':
        console.error('Realtime API error:', event.error);
        setConnectionStatus('error');
        break;
    }
  };

  // Connect to realtime API
  const connect = async () => {
    try {
      const sessionData = await createRealtimeSession();
      await setupWebRTC(sessionData);
      
      // Add welcome message
      const welcomeMessage = {
        id: Date.now(),
        text: `Hello! I'm JARVIS in realtime mode. I can now have natural voice conversations with you. How can I help you today?`,
        sender: 'ai',
        agent: selectedAgent,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages([welcomeMessage]);
      
    } catch (error) {
      console.error('Connection failed:', error);
      setConnectionStatus('error');
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect from realtime API
  const disconnect = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach(track => track.stop());
      microphoneStreamRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setMessages([]);
  };

  // Send text message
  const sendTextMessage = (text) => {
    if (!dataChannelRef.current || !text.trim()) return;
    
    const userMessage = {
      id: Date.now(),
      text,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Send to realtime API
    dataChannelRef.current.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text: text
        }]
      }
    }));
    
    // Trigger response
    dataChannelRef.current.send(JSON.stringify({
      type: 'response.create'
    }));
  };

  // Change agent
  const changeAgent = async (agentName) => {
    if (agentName === selectedAgent) return;
    
    setSelectedAgent(agentName);
    
    if (isConnected) {
      // Reconnect with new agent
      disconnect();
      setTimeout(() => {
        connect();
      }, 1000);
    }
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
            JARVIS Realtime AI
          </h1>
          <p className="text-gray-400 mt-2">Real-time voice conversation with OpenAI Realtime API</p>
          
          {/* Connection Status Indicator */}
          <div className="mt-3 flex items-center justify-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-400' :
              connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
              connectionStatus === 'error' ? 'bg-red-400' :
              'bg-gray-400'
            }`} />
            <span className="text-sm text-gray-400">
              {connectionStatus === 'connected' ? 'Realtime Connected' :
               connectionStatus === 'connecting' ? 'Connecting...' :
               connectionStatus === 'error' ? 'Connection Error' :
               'Disconnected'}
            </span>
          </div>
        </div>

        {/* Agent Selection Pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-6 px-4">
          {aiAgents.map((agent) => {
            const IconComponent = agent.icon;
            return (
              <button
                key={agent.id}
                onClick={() => changeAgent(agent.id)}
                disabled={isConnecting}
                className={`
                  px-3 py-2 rounded-full text-xs font-medium transition-all duration-300
                  ${selectedAgent === agent.id 
                    ? `bg-gradient-to-r ${agent.color} text-white shadow-lg` 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }
                  ${isConnecting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-center gap-2">
                  <IconComponent size={14} />
                  <span>{agent.name}</span>
                </div>
              </button>
            );
          })}
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
                ${aiAgents.find(a => a.id === selectedAgent)?.color || 'from-gray-700 to-gray-800'} 
                flex items-center justify-center shadow-lg
              `}>
                <button 
                  onClick={isConnected ? disconnect : connect}
                  disabled={isConnecting}
                  className="w-48 h-48 rounded-full bg-black/20 flex items-center justify-center text-white/80 hover:text-white transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50"
                >
                  {isConnecting ? (
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
                  ) : isConnected ? (
                    <PhoneOff size={60} className={isListening ? "animate-pulse" : ""} />
                  ) : (
                    <Phone size={60} />
                  )}
                </button>
              </div>
              
              {/* Status display */}
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
                <p className="text-sm text-gray-300 font-medium">
                  {isConnected ? (isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Connected') : 'Click to Connect'}
                </p>
                <p className="text-xs text-gray-500">
                  {aiAgents.find(a => a.id === selectedAgent)?.name}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Message display area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-64">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-lg p-3 rounded-lg ${msg.sender === 'user' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                <p className="text-sm">{msg.text}</p>
                <p className="text-xs text-gray-400 mt-1 text-right">{msg.timestamp}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Input bar */}
        <div className="p-6">
          <form onSubmit={(e) => { 
            e.preventDefault(); 
            const formData = new FormData(e.target);
            const text = formData.get('message');
            if (text) {
              sendTextMessage(text);
              e.target.reset();
            }
          }} className="flex items-center bg-gray-900/50 border border-gray-700 rounded-full p-2">
            <input
              name="message"
              type="text"
              placeholder={isConnected ? 'Type a message or speak naturally...' : 'Connect to start chatting'}
              className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none px-4"
              disabled={!isConnected}
            />
            <button 
              type="submit" 
              className="bg-blue-500 hover:bg-blue-600 rounded-full p-3 text-white transition-colors duration-300 disabled:opacity-50" 
              disabled={!isConnected}
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default JarvisRealtimeAgent;
