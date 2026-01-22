import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    Animated,
    PanResponder,
    StyleSheet,
    Dimensions,
    Vibration,
    Platform,
} from 'react-native';

interface SortableListProps<T> {
    data: T[];
    renderItem: (item: T, index: number, isActive: boolean) => React.ReactNode;
    onReorder: (newData: T[]) => void;
    itemHeight: number;
}

export function SortableList<T extends { id: number | string }>({
    data,
    renderItem,
    onReorder,
    itemHeight,
}: SortableListProps<T>) {
    const [items, setItems] = useState(data);
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

    // y-position of the dragging item
    const y = useRef(new Animated.Value(0)).current;
    // scroll offset placeholder if we were to implement scrolling (simplified here)

    useEffect(() => {
        setItems(data);
    }, [data]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,

            onPanResponderGrant: (e, gestureState) => {
                const { locationY } = e.nativeEvent;
                const index = Math.floor(locationY / itemHeight);

                if (index >= 0 && index < items.length) {
                    setDraggingIndex(index);
                    y.setValue(gestureState.dy + index * itemHeight);
                    // Haptic feedback
                    if (Platform.OS === 'android') {
                        Vibration.vibrate(50);
                    }
                }
            },

            onPanResponderMove: (e, gestureState) => {
                if (draggingIndex === null) return;

                // Move the floating item
                // We add the initial offset (draggingIndex * itemHeight) to the movement (dy)
                y.setValue(gestureState.dy + draggingIndex * itemHeight);
            },

            onPanResponderRelease: (e, gestureState) => {
                if (draggingIndex === null) return;

                // Calculate final index
                const currentY = gestureState.dy + draggingIndex * itemHeight;
                let newIndex = Math.floor((currentY + itemHeight / 2) / itemHeight);

                // Clamp index
                newIndex = Math.max(0, Math.min(newIndex, items.length - 1));

                if (newIndex !== draggingIndex) {
                    const newItems = [...items];
                    const [movedItem] = newItems.splice(draggingIndex, 1);
                    newItems.splice(newIndex, 0, movedItem);
                    setItems(newItems);
                    onReorder(newItems);
                }

                setDraggingIndex(null);
                y.setValue(0);
            },

            onPanResponderTerminate: () => {
                setDraggingIndex(null);
                y.setValue(0);
            },
        })
    ).current;

    return (
        <View
            style={{ height: items.length * itemHeight, position: 'relative' }}
            {...panResponder.panHandlers}
        >
            {items.map((item, index) => {
                // If this is the item being dragged, we render nothing in its place (or a placeholder)
                // The actual dragged version is rendered absolutely on top
                const isDragging = draggingIndex === index;

                return (
                    <View
                        key={item.id}
                        style={{
                            position: 'absolute',
                            top: index * itemHeight,
                            left: 0,
                            right: 0,
                            height: itemHeight,
                            opacity: isDragging ? 0 : 1,
                        }}
                    >
                        {renderItem(item, index, false)}
                    </View>
                );
            })}

            {draggingIndex !== null && (
                <Animated.View
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: itemHeight,
                        zIndex: 1000,
                        transform: [{ translateY: y }],
                        elevation: 5,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 3.84,
                    }}
                >
                    {renderItem(items[draggingIndex], draggingIndex, true)}
                </Animated.View>
            )}
        </View>
    );
}
