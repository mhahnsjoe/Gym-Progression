import { Stack } from 'expo-router';
import { DatabaseProvider } from '../db/DatabaseContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DatabaseProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#1a1a1a' },
            headerTintColor: '#00c795',
            headerShadowVisible: false,
            contentStyle: { backgroundColor: '#1a1a1a' },
            headerTitleStyle: { color: '#ffffff' },
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
    </GestureHandlerRootView>
  );
}