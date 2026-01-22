import { Stack } from 'expo-router';
import { DatabaseProvider } from '../db/DatabaseContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DatabaseProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#0A0A0A' },
            headerTintColor: '#22C55E',
            headerShadowVisible: false,
            contentStyle: { backgroundColor: '#0A0A0A' },
            headerTitleStyle: { color: '#ffffff' },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="workout/[id]" options={{ title: 'Workout' }} />
          <Stack.Screen name="history/index" options={{ title: 'History' }} />
          <Stack.Screen name="history/[id]" options={{ title: 'Workout Details' }} />
          <Stack.Screen name="programs/index" options={{ headerShown: false }} />
          <Stack.Screen name="programs/new" options={{ headerShown: false }} />
          <Stack.Screen name="programs/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="programs/[id]/edit" options={{ headerShown: false }} />
        </Stack>
      </DatabaseProvider>
    </GestureHandlerRootView>
  );
}