import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    AppState,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export default function HomeScreen({ navigation }: any) {
    const [users, setUsers] = useState<any[]>([]);
    const currentUser = auth().currentUser;
    const [lastMessages, setLastMessages] = useState<{ [key: string]: any }>({});

    useEffect(() => {
        // Set user online
        const setOnline = () => {
            firestore().collection('users').doc(currentUser?.uid).update({
                online: true,
                lastSeen: firestore.FieldValue.serverTimestamp(),
            });
        };

        // Set user offline
        const setOffline = () => {
            firestore().collection('users').doc(currentUser?.uid).update({
                online: false,
                lastSeen: firestore.FieldValue.serverTimestamp(),
            });
        };

        setOnline();

        // Listen to app state changes
        const subscription = AppState.addEventListener('change', state => {
            if (state === 'active') setOnline();
            else setOffline();
        });

        // Set offline on unmount
        return () => {
            setOffline();
            subscription.remove();
        };
    }, []);

    useEffect(() => {
        const unsubscribe = firestore()
            .collection('users')
            .onSnapshot(snapshot => {
                const list = snapshot.docs
                    .map(doc => doc.data())
                    .filter(user => user.uid !== currentUser?.uid);
                setUsers(list);
            });
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (users.length === 0) return;
        const unsubscribers = users.map(user => {
            const chatId = [currentUser?.uid, user.uid].sort().join('_');
            return firestore()
                .collection('chats')
                .doc(chatId)
                .collection('messages')
                .orderBy('createdAt', 'desc')
                .limit(1)
                .onSnapshot(snapshot => {
                    if (!snapshot.empty) {
                        const msg = snapshot.docs[0].data();
                        setLastMessages(prev => ({ ...prev, [user.uid]: msg }));
                    }
                });
        });
        return () => unsubscribers.forEach(u => u());
    }, [users]);

    const handleLogout = async () => {
        await firestore().collection('users').doc(currentUser?.uid).update({
            online: false,
            lastSeen: firestore.FieldValue.serverTimestamp(),
        });
        await auth().signOut();
    };

    const formatLastSeen = (timestamp: any) => {
        if (!timestamp?.toDate) return '';
        const date = timestamp.toDate();
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Chats</Text>
                <TouchableOpacity onPress={handleLogout}>
                    <Text style={styles.logout}>Logout</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={users}
                keyExtractor={item => item.uid}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.userItem}
                        onPress={() => navigation.navigate('Chat', { recipient: item })}>
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {item.name.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <View
                                style={[
                                    styles.statusDot,
                                    { backgroundColor: item.online ? '#4CAF50' : '#ccc' },
                                ]}
                            />
                        </View>
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>{item.name}</Text>
                            <Text style={styles.lastSeen} numberOfLines={1}>
                                {lastMessages[item.uid]
                                    ? lastMessages[item.uid].text
                                    : item.online
                                        ? 'Online'
                                        : item.lastSeen
                                            ? `Last seen ${formatLastSeen(item.lastSeen)}`
                                            : ''}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <Text style={styles.empty}>No users found. Invite friends!</Text>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#4a90e2' },
    title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    logout: { color: '#fff', fontSize: 14 },
    userItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    avatarContainer: { position: 'relative', marginRight: 12 },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#4a90e2', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    statusDot: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
    userInfo: { flex: 1 },
    userName: { fontSize: 16, color: '#333', fontWeight: '500' },
    lastSeen: { fontSize: 12, color: '#999', marginTop: 2 },
    empty: { textAlign: 'center', marginTop: 40, color: '#999' },
});