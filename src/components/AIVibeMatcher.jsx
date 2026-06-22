import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Loader2, Play } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { searchMulti } from '../services/tmdb';
import { generateVibeSearch } from '../services/ai';
import './AIVibeMatcher.css';

export default function AIVibeMatcher() {
  const { openModal } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: '🍿 Hey! Tell me what kind of movie or TV show you are in the mood for. E.g. "a mind-bending space adventure" or "creepy spooky horror," and I\'ll find the perfect match!'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userPrompt = input.trim();
    setInput('');
    setLoading(true);

    const userMsgId = Date.now();
    setMessages(prev => [...prev, { id: userMsgId, sender: 'user', text: userPrompt }]);

    const botTempId = userMsgId + 1;
    setMessages(prev => [...prev, { id: botTempId, sender: 'bot', text: 'Analyzing your vibe...', isThinking: true }]);

    try {
      const recommendations = await generateVibeSearch(userPrompt);
      
      if (recommendations && recommendations.length > 0) {
        const resolvedItems = [];
        for (const rec of recommendations) {
          try {
            const tmdbResults = await searchMulti(rec.title);
            if (tmdbResults && tmdbResults.length > 0) {
              const matchedItem = tmdbResults[0];
              resolvedItems.push({
                ...matchedItem,
                reason: rec.reason
              });
            }
          } catch (err) {
            console.error('Failed to resolve recommendation:', rec.title, err);
          }
        }

        setMessages(prev => prev.map(msg => {
          if (msg.id === botTempId) {
            return {
              id: botTempId,
              sender: 'bot',
              text: resolvedItems.length > 0 
                ? `✨ Here are some recommendations that fit your vibe:` 
                : `Sorry, I couldn't find matching titles in the TMDB catalog for the recommendations.`,
              items: resolvedItems
            };
          }
          return msg;
        }));
      } else {
        throw new Error('Unexpected API response structure');
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => prev.map(msg => {
        if (msg.id === botTempId) {
          return {
            id: botTempId,
            sender: 'bot',
            text: `⚠️ Unable to connect to the AI recommendation service. Please make sure the API key is valid and you have network access.`
          };
        }
        return msg;
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        type="button" 
        className="ai-vibe-bubble glass" 
        onClick={() => setIsOpen(!isOpen)}
        title="AI Vibe Matcher"
      >
        <Sparkles size={22} className="sparkle-pulse" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="ai-vibe-chat-panel glass"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="ai-chat-header">
              <div className="ai-chat-header-title">
                <Sparkles size={18} style={{ color: 'var(--accent)' }} />
                <span>AI Vibe Matcher</span>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="ai-chat-close-btn">
                <X size={18} />
              </button>
            </div>

            <div className="ai-chat-messages">
              {messages.map(msg => (
                <div key={msg.id} className={`ai-chat-bubble-row ${msg.sender}-row`}>
                  <div className={`ai-chat-bubble ${msg.sender}-bubble`}>
                    {msg.isThinking ? (
                      <div className="ai-chat-thinking">
                        <Loader2 className="spinner" size={14} />
                        <span>{msg.text}</span>
                      </div>
                    ) : (
                      <p>{msg.text}</p>
                    )}

                    {msg.items && msg.items.length > 0 && (
                      <div className="ai-recommendation-list">
                        {msg.items.map(item => (
                          <div key={item.id} className="ai-recommendation-card glass" onClick={() => openModal(item)}>
                            <img src={item.poster || item.backdrop} alt={item.title} className="ai-rec-poster" />
                            <div className="ai-rec-details">
                              <h4 className="ai-rec-title">{item.title}</h4>
                              <span className="ai-rec-meta">{item.year} &middot; ★ {item.rating || 'N/A'}</span>
                              <p className="ai-rec-reason">{item.reason}</p>
                            </div>
                            <div className="ai-rec-play-hover">
                              <Play size={20} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSend} className="ai-chat-input-form">
              <input 
                type="text"
                placeholder="Describe your vibe (e.g. funny space comedy)..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                required
              />
              <button type="submit" disabled={loading || !input.trim()} className="ai-chat-send-btn">
                {loading ? <Loader2 className="spinner" size={16} /> : <Send size={16} />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
