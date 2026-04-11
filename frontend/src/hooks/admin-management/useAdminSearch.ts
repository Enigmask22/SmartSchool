import { useState, useCallback } from 'react';

export function useAdminSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  const resetSearch = useCallback(() => {
    setSearchTerm('');
    setShowDeleted(false);
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    showDeleted,
    setShowDeleted,
    resetSearch,
  };
}
