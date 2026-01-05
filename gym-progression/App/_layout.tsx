import { Stack } from 'expo-router';
import { DatabaseProvider } from '../db/DatabaseContext';

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#ffffff' },
          headerTintColor: '#1a1a1a',
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#f5f5f5' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Gym Tracker' }} />
        <Stack.Screen name="workout/[id]" options={{ title: 'Workout' }} />
        <Stack.Screen name="history/index" options={{ title: 'History' }} />
        <Stack.Screen name="history/[id]" options={{ title: 'Workout Details' }} />
        <Stack.Screen name="templates/index" options={{ title: 'Templates' }} />
        <Stack.Screen name="templates/new" options={{ title: 'New Template' }} />
      </Stack>
    </DatabaseProvider>
  );
}