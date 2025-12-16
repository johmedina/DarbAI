import { motion } from 'framer-motion';
import { MessageCircle, BotIcon } from 'lucide-react';

export const Overview = () => {
  return (
    <>
    <motion.div
      key="overview"
      className="max-w-3xl mx-auto md:mt-20"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.75 }}
    >
      <div className="rounded-xl p-6 flex flex-col gap-8 leading-relaxed text-center max-w-xl">
        <img src="src/assets/images/logo.png" alt="Logo" className="h-auto w-auto" />
        <p style={{marginTop: -100}}>
          Welcome to <strong>DarbAI</strong><br />
          Your AI companion for driving confidence in Qatar
        </p>
      </div>
    </motion.div>
    </>
  );
};
