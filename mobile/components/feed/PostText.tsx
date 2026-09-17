import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/core";
export function PostText({heading,content}:{heading?:string|null;content:string}){const[expanded,setExpanded]=useState(false);const long=content.length>280;return <View style={{gap:7}}>{heading&&<Text variant="heading" style={{color:"#1E4C9A"}}>{heading}</Text>}<Text numberOfLines={expanded?undefined:6}>{content}</Text>{long&&<Pressable accessibilityRole="button" onPress={()=>setExpanded(value=>!value)}><Text variant="label" color="accent">{expanded?"Show less":"Show more"}</Text></Pressable>}</View>}
