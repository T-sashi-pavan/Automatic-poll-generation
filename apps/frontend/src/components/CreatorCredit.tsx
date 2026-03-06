import React from 'react';

const CreatorCredit: React.FC = () => {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%, 100% {
            opacity: 0.5;
            text-shadow: 0 0 5px rgba(217, 119, 6, 0.3), 
                         0 0 10px rgba(180, 83, 9, 0.2);
          }
          50% {
            opacity: 1;
            text-shadow: 0 0 10px rgba(217, 119, 6, 0.6), 
                         0 0 20px rgba(180, 83, 9, 0.4),
                         0 0 30px rgba(251, 146, 60, 0.3);
          }
        }

        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 5px rgba(217, 119, 6, 0.2),
                        inset 0 0 5px rgba(217, 119, 6, 0.1);
          }
          50% {
            box-shadow: 0 0 15px rgba(217, 119, 6, 0.4),
                        0 0 25px rgba(251, 146, 60, 0.3),
                        inset 0 0 10px rgba(217, 119, 6, 0.15);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        .creator-credit-container {
          animation: glow 3s ease-in-out infinite;
          backdrop-filter: blur(10px);
          background: linear-gradient(135deg, rgba(217, 119, 6, 0.1) 0%, rgba(251, 146, 60, 0.05) 100%);
          border: 1px solid rgba(217, 119, 6, 0.3);
        }

        .creator-credit-text {
          animation: shimmer 3s ease-in-out infinite;
          background: linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .creator-credit-badge {
          animation: float 3s ease-in-out infinite;
        }

        @media (max-width: 640px) {
          .creator-credit-container {
            padding: 0.5rem 0.75rem;
            font-size: 0.75rem;
            border-radius: 0.5rem;
          }
        }

        @media (min-width: 641px) and (max-width: 1024px) {
          .creator-credit-container {
            padding: 0.625rem 0.875rem;
            font-size: 0.875rem;
            border-radius: 0.625rem;
          }
        }

        @media (min-width: 1025px) {
          .creator-credit-container {
            padding: 0.75rem 1rem;
            font-size: 0.9375rem;
            border-radius: 0.75rem;
          }
        }
      `}</style>

      <div className="creator-credit-badge fixed top-4 left-4 z-40">
        <div className="creator-credit-container rounded-lg">
          <div className="flex flex-col items-start">
            <span className="creator-credit-text font-bold tracking-wider text-sm md:text-base">
              👑 T SASHI PAVAN
            </span>
            <span className="creator-credit-text font-semibold tracking-wide text-xs md:text-sm opacity-80">
              T SASHI PAVAN POLL SYSTEM
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreatorCredit;
