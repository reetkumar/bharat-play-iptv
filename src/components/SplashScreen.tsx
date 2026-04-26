import { motion } from 'motion/react';

export default function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-[100] overflow-hidden"
    >
      {/* Full screen photo */}
      <img
        src="/177633043.png"
        alt="splash"
        className="absolute inset-0 w-full h-full object-cover object-center brightness-110"
      />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

      {/* Logo + title at bottom */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="absolute bottom-16 left-0 right-0 flex flex-col items-center gap-3"
      >
        <h1 className="text-5xl font-black tracking-tighter text-white drop-shadow-lg">BHARAT PLAY</h1>
        <p className="text-white/60 text-xs font-semibold tracking-[0.3em] uppercase">Premium Streaming Experience</p>

        {/* Loading dots */}
        <div className="flex gap-1.5 mt-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              className="w-1.5 h-1.5 bg-red-500 rounded-full"
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
