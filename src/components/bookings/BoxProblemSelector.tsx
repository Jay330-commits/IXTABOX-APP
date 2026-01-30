'use client';

import React, { useState } from 'react';

export type BoxProblemType = 'led_light' | 'hinge' | 'scratches' | 'lock' | 'other';

interface BoxProblem {
  type: BoxProblemType;
  description?: string;
}

interface BoxProblemSelectorProps {
  bookingId: string;
  onProblemReported?: (problems: BoxProblem[]) => void;
  initialProblems?: BoxProblem[];
}

const PROBLEM_OPTIONS: { value: BoxProblemType; label: string }[] = [
  { value: 'led_light', label: 'LED Light Issue' },
  { value: 'hinge', label: 'Hinge Problem' },
  { value: 'scratches', label: 'Scratches/Damage' },
  { value: 'lock', label: 'Lock Issue' },
  { value: 'other', label: 'Other Issue' },
];

export default function BoxProblemSelector({
  bookingId,
  onProblemReported,
  initialProblems = [],
}: BoxProblemSelectorProps) {
  const [selectedProblems, setSelectedProblems] = useState<BoxProblem[]>(initialProblems);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherDescription, setOtherDescription] = useState('');

  const handleProblemToggle = (problemType: BoxProblemType) => {
    setError(null);
    setSuccess(false);
    
    if (problemType === 'other') {
      setShowOtherInput(!showOtherInput);
      if (!showOtherInput) {
        // Add other problem
        setSelectedProblems([...selectedProblems, { type: 'other', description: '' }]);
      } else {
        // Remove other problem
        setSelectedProblems(selectedProblems.filter(p => p.type !== 'other'));
        setOtherDescription('');
      }
    } else {
      const existingIndex = selectedProblems.findIndex(p => p.type === problemType);
      if (existingIndex >= 0) {
        // Remove problem
        setSelectedProblems(selectedProblems.filter(p => p.type !== problemType));
      } else {
        // Add problem
        setSelectedProblems([...selectedProblems, { type: problemType }]);
      }
    }
  };

  const handleSubmit = async () => {
    if (selectedProblems.length === 0) {
      setError('Please select at least one problem to report.');
      return;
    }

    // If "other" is selected, ensure description is provided
    const otherProblem = selectedProblems.find(p => p.type === 'other');
    if (otherProblem && !otherDescription.trim()) {
      setError('Please provide a description for the "Other" issue.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const authToken = localStorage.getItem('auth-token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      // Prepare problems with descriptions
      const problemsToSubmit = selectedProblems.map(p => {
        if (p.type === 'other') {
          return { type: p.type, description: otherDescription.trim() };
        }
        return p;
      });

      const response = await fetch(`/api/bookings/${bookingId}/report-problems`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ problems: problemsToSubmit }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to report problems');
      }

      setSuccess(true);
      if (onProblemReported) {
        onProblemReported(problemsToSubmit);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error reporting box problems:', err);
      setError(err instanceof Error ? err.message : 'Failed to report problems. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isProblemSelected = (problemType: BoxProblemType) => {
    return selectedProblems.some(p => p.type === problemType);
  };

  return (
    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
      <h3 className="text-sm font-medium text-gray-400 mb-3">Report Box Problems</h3>
      
      <div className="space-y-3">
        {/* Problem Options - Spinner/Wheel Style */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {PROBLEM_OPTIONS.map((option) => {
            const isSelected = isProblemSelected(option.value);
            return (
              <button
                key={option.value}
                onClick={() => handleProblemToggle(option.value)}
                disabled={isSubmitting}
                className={`
                  relative p-3 rounded-lg border transition-all duration-200
                  ${isSelected 
                    ? 'bg-yellow-500/20 border-yellow-400/50 shadow-lg shadow-yellow-500/20' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <div className="flex flex-col items-center justify-center gap-1 min-h-[60px]">
                  <span className={`text-xs font-medium text-center ${isSelected ? 'text-yellow-300' : 'text-gray-300'}`}>
                    {option.label}
                  </span>
                </div>
                {isSelected && (
                  <div className="absolute top-1 right-1">
                    <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Other Description Input */}
        {showOtherInput && (
          <div className="mt-3">
            <label className="block text-xs text-gray-400 mb-2">
              Please describe the issue:
            </label>
            <textarea
              value={otherDescription}
              onChange={(e) => {
                setOtherDescription(e.target.value);
                setError(null);
                // Update the "other" problem description
                setSelectedProblems(selectedProblems.map(p => 
                  p.type === 'other' ? { ...p, description: e.target.value } : p
                ));
              }}
              placeholder="Describe the problem..."
              rows={3}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <div className="text-sm text-red-400 font-medium">{error}</div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <div className="text-sm text-green-400 font-medium flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Problems reported successfully!
            </div>
          </div>
        )}

        {/* Submit Button */}
        {selectedProblems.length > 0 && (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (showOtherInput && !otherDescription.trim())}
            className="w-full py-2 px-4 bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Reporting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Report Problems
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
