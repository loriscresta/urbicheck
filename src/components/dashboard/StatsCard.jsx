import React from "react";
import { motion } from "framer-motion";

export default function StatsCard({ icon: Icon, label, value, sublabel, highlight = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border p-6 hover:shadow-md transition-shadow"
      style={{ borderColor: '#E8E4DC', boxShadow: '0 2px 12px rgba(13,27,42,0.06)' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7A8D' }}>{label}</p>
          <p
            className="text-3xl font-extrabold mt-2 tracking-tight"
            style={{ color: highlight ? '#C8A06E' : '#0D1B2A', fontFamily: 'Georgia, serif' }}
          >
            {value}
          </p>
          {sublabel && <p className="text-xs mt-1" style={{ color: '#6B7A8D' }}>{sublabel}</p>}
        </div>
        <div
          className="p-3 rounded-full"
          style={{ background: 'rgba(200,160,110,0.12)' }}
        >
          <Icon className="w-5 h-5" style={{ color: '#C8A06E' }} />
        </div>
      </div>
    </motion.div>
  );
}