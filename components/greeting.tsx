import { motion } from 'framer-motion';

export const Greeting = () => {
  return (
    <div
      key="overview"
      className="max-w-2xl mx-auto mt-4 sm:mt-8 lg:mt-12 px-4 sm:px-8 size-full flex flex-col justify-center relative z-0"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
        className="text-lg sm:text-xl lg:text-2xl font-semibold text-center"
      >
        Hello there!
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
        className="text-base sm:text-lg lg:text-xl text-zinc-500 text-center mt-1 sm:mt-2"
      >
        How can I help you today?
      </motion.div>
    </div>
  );
};
