import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { IconButton } from "@/components/core";
const VIDEO=/\.(mp4|mov|m4v|webm)(\?|$)/i;
function Video({uri}:{uri:string}){const player=useVideoPlayer(uri);return <VideoView player={player} style={styles.media} nativeControls contentFit="contain" />}
export function PostMedia({urls}:{urls:string[]}){const[open,setOpen]=useState<string|null>(null);if(!urls.length)return null;return <><ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{borderRadius:16}}>{urls.map(uri=><Pressable key={uri} onPress={()=>setOpen(uri)} accessibilityRole="imagebutton" accessibilityLabel="Open post media">{VIDEO.test(uri)?<Video uri={uri}/>:<Image source={{uri}} style={styles.media} contentFit="cover" transition={160} cachePolicy="memory-disk" />}</Pressable>)}</ScrollView><Modal visible={!!open} animationType="fade" statusBarTranslucent onRequestClose={()=>setOpen(null)}><View style={styles.viewer}>{open&&(VIDEO.test(open)?<Video uri={open}/>:<Image source={{uri:open}} style={StyleSheet.absoluteFill} contentFit="contain" />)}<View style={styles.close}><IconButton icon="close" label="Close media" onPress={()=>setOpen(null)} /></View></View></Modal></>}
const styles=StyleSheet.create({media:{width:340,height:260,backgroundColor:"#111"},viewer:{flex:1,backgroundColor:"#000",justifyContent:"center"},close:{position:"absolute",top:52,right:18}});
