import React from "react";

const ReliabilityResult = ({ reliabilityScore, insights }) => {
  if (!insights) {
    return <div className="mt-8 p-6 bg-gray-100 rounded-lg">No insights available.</div>;
  }

  // Function to remove leading dash
  const cleanInsight = (insight) => insight.replace(/^- /, '').trim();

  // Separate insights into accuracy/context and biases
  const accuracyInsights = insights.filter(insight => 
    !insight.toLowerCase().includes('bias') && 
    !insight.toLowerCase().includes('biased')
  );
  const biasInsights = insights.filter(insight => 
    insight.toLowerCase().includes('bias') || 
    insight.toLowerCase().includes('biased')
  );

  // Determine scale color and rotation based on reliability score
  let scaleColor = '';
  let scaleRotation = '';

  if (reliabilityScore <= 50) {
    scaleColor = 'bg-red-400';
    scaleRotation = '-rotate-6';
  } else if (reliabilityScore <= 75) {
    scaleColor = 'bg-yellow-400';
    scaleRotation = 'rotate-0';
  } else {
    scaleColor = 'bg-green-400';
    scaleRotation = 'rotate-6';
  }

  return (
    <div className="mt-8 p-6 bg-gray-100 rounded-lg">
      <h2 className="text-2xl font-bold">Reliability Score: {reliabilityScore}%</h2>
      
      {/* Scale Visualization */}
      <style>
        {`
          @keyframes scaleAnimation {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(-5deg); }
            75% { transform: rotate(5deg); }
          }
          .scale-animate {
            animation: scaleAnimation 3s ease-in-out;
          }
        `}
      </style>
      <div className="relative w-48 h-48 mx-auto mt-6">
        {/* Beam */}
        <div className={`absolute w-36 h-1 bg-gray-800 top-8 left-6 origin-center transition-transform duration-300 ${scaleRotation}`}></div>
        
        {/* Left Pan */}
        <div className={`absolute w-12 h-12 rounded-full border-4 border-gray-800 ${scaleColor} top-16 left-0 transition-colors duration-300 flex items-center justify-center`}>
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
        </div>
        
        {/* Right Pan */}
        <div className={`absolute w-12 h-12 rounded-full border-4 border-gray-800 ${scaleColor} top-16 right-0 transition-colors duration-300 flex items-center justify-center`}>
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
        </div>
        
        {/* Base */}
        <div className="absolute w-5 h-24 bg-gray-800 bottom-0 left-1/2 transform -translate-x-1/2"></div>
        
        {/* Support Beam */}
        <div className="absolute w-1 h-8 bg-gray-800 top-0 left-1/2 transform -translate-x-1/2"></div>
        
        {/* Decorative Top */}
        <div className="absolute w-8 h-8 bg-gray-800 rounded-full top-[-16px] left-1/2 transform -translate-x-1/2"></div>
      </div>

      {/* Accuracy & Context Section */}
      <div className="mt-6">
        <h3 className="text-xl font-semibold">Accuracy & Context:</h3>
        <ul className="list-disc list-inside mt-2 space-y-1">
          {accuracyInsights.length > 0 ? (
            accuracyInsights.map((insight, index) => (
              <li key={index} className="text-gray-700">
                {cleanInsight(insight)}
              </li>
            ))
          ) : (
            <li className="text-gray-500">No specific accuracy insights available</li>
          )}
        </ul>
      </div>

      {/* Potential Biases Section */}
      <div className="mt-6">
        <h3 className="text-xl font-semibold">Potential Biases:</h3>
        <ul className="list-disc list-inside mt-2 space-y-1">
          {biasInsights.length > 0 ? (
            biasInsights.map((insight, index) => (
              <li key={index} className="text-gray-700">
                {cleanInsight(insight)}
              </li>
            ))
          ) : (
            <li className="text-gray-500">No obvious biases detected</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default ReliabilityResult;