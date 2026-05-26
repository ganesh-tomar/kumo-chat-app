import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export default function ChatScreen({ route }: any) {
    const { recipient } = route.params;
    const currentUser = auth().currentUser;
    const [messages, setMessages] = useState<any[]>([]);
    const [text, setText] = useState('');

    const chatId = [currentUser?.uid, recipient.uid].sort().join('_');

    useEffect(() => {
        const unsubscribe = firestore()
            .collection('chats')
            .doc(chatId)
            .collection('messages')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                const msgs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setMessages(msgs);
            });
        return unsubscribe;
    }, []);

    const sendMessage = async () => {
        if (!text.trim()) return;
        await firestore()
            .collection('chats')
            .doc(chatId)
            .collection('messages')
            .add({
                text,
                senderId: currentUser?.uid,
                createdAt: firestore.FieldValue.serverTimestamp(),
            });
        setText('');
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={90}>
            <FlatList
                data={messages}
                inverted
                keyExtractor={item => item.id}
                renderItem={({ item }) => {
                    const isMe = item.senderId === currentUser?.uid;
                    return (
                        <View
                            style={[
                                styles.messageBubble,
                                isMe ? styles.myMessage : styles.theirMessage,
                            ]}>
                            <Text style={isMe ? styles.myText : styles.theirText}>
                                {item.text}
                            </Text>
                            <Text style={styles.timestamp}>
                                {item.createdAt?.toDate
                                    ? item.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : ''}
                            </Text>
                        </View>
                    );
                }}
            />
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    value={text}
                    onChangeText={setText}
                    placeholder="Type a message..."
                    multiline
                />
                <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                    <Text style={styles.sendText}>Send</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f4ff' },
    messageBubble: { maxWidth: '75%', padding: 10, borderRadius: 8, marginVertical: 4, marginHorizontal: 12 },
    myMessage: { backgroundColor: '#e8f0fe', alignSelf: 'flex-end' },
    theirMessage: { backgroundColor: '#fff', alignSelf: 'flex-start' },
    myText: { color: '#333' },
    theirText: { color: '#333' },
    inputContainer: { flexDirection: 'row', padding: 8, backgroundColor: '#fff', alignItems: 'center' },
    input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, maxHeight: 100 },
    sendButton: { backgroundColor: '#4a90e2', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
    sendText: { color: '#fff', fontWeight: 'bold' },
    timestamp: { fontSize: 10, color: '#999', alignSelf: 'flex-end', marginTop: 4 },
});