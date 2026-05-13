import React from "react";
import { motion } from "framer-motion";

export default function StatsCard({ icon: Icon, label, value, sublabel, highlight = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6"
      style={{ border: '1px solid #C4BAA8' }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] font-semibold uppercase tracking-[2px] mb-3"
            style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {label}
          </p>
          <p
            className="text-2xl font-bold leading-none"
            style={{
              color: highlight ? '#B33A2A' : '#1A3A6B',
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            {value}
          </p>
          {sublabel && (
            <p className="text-xs mt-2" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
              {sublabel}
            </p>
          )}
        </div>
        <div className="w-9 h-9 flex items-center justify-center shrink-0 ml-3" style={{ background: '#F4EFE6', border: '1px solid #C4BAA8' }}>
          <Icon className="w-4 h-4" style={{ color: highlight ? '#B33A2A' : '#1A3A6B' }} />
        </div>
      </div>
    </motion.div>
  );
}