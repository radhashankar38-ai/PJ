import { useEffect, useState } from 'react';
import { Check, CheckCheck } from 'lucide-react';

export function MessageStatus({ createdAt }: { createdAt: string }) {
  const [status, setStatus] = useState<'sent' | 'delivered' | 'read'>('sent');

  useEffect(() => {
    const updateStatus = () => {
      const diff = (new Date().getTime() - new Date(createdAt).getTime()) / 1000;
      if (diff >= 3) {
        setStatus('read');
      } else if (diff >= 1) {
        setStatus('delivered');
      } else {
        setStatus('sent');
      }
    };

    updateStatus();
    
    // Check again after 1s and 3s
    const timer1 = setTimeout(updateStatus, 1500);
    const timer2 = setTimeout(updateStatus, 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [createdAt]);

  if (status === 'sent') {
    return <div className="w-4 flex justify-center"><Check className="w-3.5 h-3.5 text-gray-400" /></div>;
  }
  
  if (status === 'delivered') {
    return <div className="w-4 flex justify-center"><CheckCheck className="w-3.5 h-3.5 text-gray-400" /></div>;
  }

  return <div className="w-4 flex justify-center"><CheckCheck className="w-3.5 h-3.5 text-blue-500" /></div>;
}
