import { useMutation } from "@tanstack/react-query";
import * as ImageManipulator from "expo-image-manipulator";
import type { ImagePickerAsset } from "expo-image-picker";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
const MAX_FILE_SIZE=5*1024*1024;
const ALLOWED_TYPES=new Set(["image/jpeg","image/png","image/webp","image/gif"]);
export function useAvatarUpload(){const{user,refreshProfile}=useAuth();return useMutation({mutationFn:async(asset:ImagePickerAsset)=>{if(!user)throw new Error("Not signed in");if(asset.fileSize&&asset.fileSize>MAX_FILE_SIZE)throw new Error("Image must be under 5MB.");if(asset.mimeType&&!ALLOWED_TYPES.has(asset.mimeType))throw new Error("Choose a JPEG, PNG, WebP or GIF image.");const prepared=await ImageManipulator.manipulateAsync(asset.uri,[{resize:{width:1024}}],{compress:.82,format:ImageManipulator.SaveFormat.JPEG});const bytes=await(await fetch(prepared.uri)).arrayBuffer();if(bytes.byteLength>MAX_FILE_SIZE)throw new Error("Prepared image is still over 5MB.");const path=`${user.id}/avatar-${Date.now()}.jpg`;const{error:uploadError}=await supabase.storage.from("avatars").upload(path,bytes,{contentType:"image/jpeg",upsert:true});if(uploadError)throw uploadError;const{data}=supabase.storage.from("avatars").getPublicUrl(path);const{error:updateError}=await supabase.from("profiles").update({avatar_url:data.publicUrl}).eq("id",user.id);if(updateError){await supabase.storage.from("avatars").remove([path]);throw updateError;}await refreshProfile();return data.publicUrl;}});}
