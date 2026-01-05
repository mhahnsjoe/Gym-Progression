import React, { createContext, useContext, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { initDatabase } from './schema';

const DatabaseContext = createContext<SQLite.SQLiteDatabase | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initDatabase()
      .then(setDb)
      .catch((err) => {
        console.error('Database init error:', err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return null;
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red' }}>Database Error: {error}</Text>
      </View>
    );
  }

  return (
    <DatabaseContext.Provider value={db}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase(): SQLite.SQLiteDatabase {
  const db = useContext(DatabaseContext);
  if (!db) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return db;
}