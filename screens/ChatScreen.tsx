// Elvina Neila Samas 24060123120031
// maaf pak untuk upload gambarnya hanya tersimpan di local chat karena kalau di upload ke firebase storage perlu upgrade firebaasenya ke blaze plan

import React, { useEffect, useState, useRef } from "react";
import {
  View, Text, TextInput, Button, FlatList,
  StyleSheet, Image, TouchableOpacity, ActivityIndicator,
  PermissionsAndroid, Platform, Alert, Modal
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../App";
import {
  auth, signOut, messagesCollection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot, storage, ref,
  uploadBytes, getDownloadURL
} from "../firebase";

import { launchImageLibrary } from "react-native-image-picker";

type MessageType = {
  id: string;
  text?: string;
  imageUrl?: string;
  senderID: string; 
  createdAt: any;
  // Tambahkan flag untuk pesan lokal yang belum di-upload
  isLocal?: boolean; 
};

type Props = NativeStackScreenProps<RootStackParamList, "Chat">;

export default function ChatScreen({ navigation, route }: Props) {
  const [message, setMessage] = useState("");
  // Ubah inisialisasi messages untuk menampung pesan lokal sementara
  const [messages, setMessages] = useState<MessageType[]>([]); 
  const [uploading, setUploading] = useState(false);

  const [imageDraftUri, setImageDraftUri] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");

  const userEmail = auth.currentUser?.email || "Anonymous";
  const flatListRef = useRef<FlatList>(null);

  const routeName = (route.params as any)?.name; 
  const displayName = routeName || userEmail; 

  // Load chat
  useEffect(() => {
    const q = query(messagesCollection, orderBy("createdAt", "asc"));

    const unsub = onSnapshot(q, (snapshot) => {
      const list: MessageType[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as MessageType);
      });
      
      // FIX: Jangan timpa pesan lokal yang mungkin sedang menunggu upload
      setMessages(prevMessages => {
        const localMessages = prevMessages.filter(msg => msg.isLocal);
        return [...list, ...localMessages].sort((a, b) => {
            // Urutkan berdasarkan createdAt (jika tersedia)
            const timeA = a.createdAt?.seconds || Date.now() / 1000;
            const timeB = b.createdAt?.seconds || Date.now() / 1000;
            return timeA - timeB;
        });
      });
      
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, (error) => {
        // Tampilkan pesan error jika Firebase access ditolak (Error 2)
        console.error("Firestore Error:", error);
        if (error.code === 'permission-denied') {
            Alert.alert("Akses Ditolak", "Gagal memuat pesan. Pastikan Aturan Keamanan Firebase sudah di-Publish.");
        }
    });

    return () => unsub();
  }, []);

  // Logout
  const handleLogout = () => {
    signOut(auth).then(() => navigation.replace("Login"));
  };

  // Send text or image (sudah dimodifikasi untuk menambahkan pesan lokal)
  const sendMessage = async (url: string | null = null, text: string = "", isLocal: boolean = false) => {
    const finalText = text.trim() || message.trim();
    if (!finalText && !url) return;
    
    // --- 1. Tampilkan di UI secara lokal (Instant UI Update) ---
    const localMsg: MessageType = {
        id: Date.now().toString() + Math.random(),
        text: finalText,
        imageUrl: url,
        senderID: userEmail,
        createdAt: serverTimestamp(), // Gunakan ini sebagai timestamp lokal sementara
        isLocal: isLocal
    };
    
    setMessages(prev => [...prev, localMsg]);
    // -------------------------------------------------------------

    // --- 2. Coba kirim ke Firebase jika bukan pesan lokal ---
    if (!isLocal) {
        try {
            await addDoc(messagesCollection, {
                text: finalText,
                imageUrl: url,
                senderID: userEmail,
                createdAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("Failed to send message to Firestore:", error);
            Alert.alert("Gagal Kirim", "Pesan tidak terkirim ke server (Firestore).");
        }
    }
    // ---------------------------------------------------------

    if (!url) {
      setMessage("");
    }
  };

  // --- Izin Storage (Tetap perlu untuk akses galeri) ---
  const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS !== "android") return true;
    // ... (kode izin sama)
    try {
      const permissions: string[] = [];
      if (Platform.Version >= 33) {
        permissions.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
      } else {
        permissions.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
      }
      const statuses = await PermissionsAndroid.requestMultiple(permissions);
      const isGranted = permissions.some(
        (permission) => statuses[permission] === PermissionsAndroid.RESULTS.GRANTED
      );
      return isGranted;
    } catch (err) {
      console.warn("Permission Request Error: ", err);
      return false;
    }
  };
  // ------------------------------------------------------

  // PICK IMAGE (Membuka Preview)
  const pickImage = async () => {
    const permissionGranted = await requestStoragePermission();
    if (!permissionGranted) {
      Alert.alert("Izin Diperlukan", "Mohon izinkan akses galeri untuk mengunggah foto.");
      return;
    }

    const result = await launchImageLibrary({
      mediaType: "photo",
      selectionLimit: 1,
      quality: 0.7,
    });

    if (result.didCancel || !result.assets || result.assets.length === 0) {
      return;
    }

    const uri = result.assets[0].uri;
    if (uri) {
      setImageDraftUri(uri); // Buka modal preview
      setCaptionDraft("");
    }
  };
  
  // UPLOAD DARI MODAL (Dimodifikasi: Skip Upload ke Firebase, Langsung Tampil Lokal)
  const uploadAndSendImage = async () => {
    if (!imageDraftUri) return;

    const uri = imageDraftUri;
    const caption = captionDraft;

    // --- LOGIKA UTAMA PERUBAHAN ---
    // 1. Tampilkan di UI secara lokal (menggunakan isLocal: true)
    await sendMessage(uri, caption, true); 
    
    // 2. Tunda/Abaikan Upload ke Firebase Storage 
    //    (Code upload yang bermasalah di-komentar atau dihapus)
    
    // Alert.alert("Upload Ditunda", "Foto hanya ditampilkan secara lokal karena izin Firebase Storage belum diatur.");
    // -----------------------------
    
    // Reset Draft State dan Tutup Modal
    setImageDraftUri(null);
    setCaptionDraft("");
    // Hapus setUploading(false) karena kita tidak lagi upload
  };
  

  // Render chat bubble
  const renderItem = ({ item }: { item: MessageType }) => (
    <View
      style={[
        styles.msgBox,
        item.senderID === userEmail ? styles.myMsg : styles.otherMsg,
        // Optional: Tambahkan border untuk pesan lokal
        item.isLocal ? { borderWidth: 1, borderColor: 'orange', opacity: 0.8 } : {}, 
      ]}
    >
      <Text style={styles.sender}>{item.senderID} {item.isLocal ? '(Lokal)' : ''}</Text>

      {item.imageUrl && (
        <Image
          source={{ uri: item.imageUrl }}
          style={{ width: 200, height: 200, borderRadius: 10, marginBottom: item.text ? 5 : 0 }}
        />
      )}

      {item.text ? <Text>{item.text}</Text> : null}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text>Hi, {displayName}</Text>
        <Button title="Logout" color="red" onPress={handleLogout} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 10 }}
      />

      <View style={styles.inputRow}>
        <TouchableOpacity 
          onPress={pickImage} 
          style={styles.imgBtn}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={{ color: "white", fontSize: 22 }}>+</Text>
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Ketik pesan..."
          value={message}
          onChangeText={setMessage}
          editable={!uploading}
        />

        <Button 
          title="Kirim" 
          color="green" 
          onPress={() => sendMessage(null)}
          disabled={uploading || message.trim() === ""}
        />
      </View>
      
      {/* --- MODAL PREVIEW GAMBAR --- */}
      <Modal
        visible={!!imageDraftUri}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setImageDraftUri(null)}
      >
        <View style={modalStyles.container}>
          
          <TouchableOpacity 
            onPress={() => setImageDraftUri(null)} 
            style={modalStyles.closeButton}
          >
            <Text style={{ fontSize: 24, color: 'white' }}>&#x2190;</Text> 
          </TouchableOpacity>

          <Image
            source={{ uri: imageDraftUri || undefined }}
            style={modalStyles.imagePreview}
          />
          <View style={modalStyles.inputContainer}>
            <TextInput
              style={modalStyles.captionInput}
              placeholder="Tambahkan keterangan (caption)..."
              placeholderTextColor="#ccc"
              value={captionDraft}
              onChangeText={setCaptionDraft}
              multiline
            />
            
            <TouchableOpacity 
              onPress={uploadAndSendImage} 
              style={modalStyles.sendButton}
              // uploadAndSendImage sudah disetel untuk skip uploading state
            >
              <Text style={{ color: "white", fontSize: 18, fontWeight: 'bold' }}>KIRIM</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* --- AKHIR MODAL --- */}
    </View>
  );
}

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: '70%',
    resizeMode: 'contain',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#333',
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  captionInput: {
    flex: 1,
    backgroundColor: '#555',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    color: 'white',
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: 'green',
    width: 60,
    height: 40,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40, 
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: "#f2f2f2",
    alignItems: "center",
  },
  inputRow: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    marginHorizontal: 10,
    padding: 8,
    borderRadius: 6,
  },
  imgBtn: {
    backgroundColor: "blue",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: -5,
  },
  msgBox: {
    padding: 10,
    marginVertical: 6,
    borderRadius: 6,
    maxWidth: "80%",
  },
  myMsg: {
    backgroundColor: "#d1f0ff",
    alignSelf: "flex-end",
  },
  otherMsg: {
    backgroundColor: "#eee",
    alignSelf: "flex-start",
  },
  sender: {
    fontWeight: "bold",
    marginBottom: 2,
    fontSize: 10,
    color: "gray",
  },
});