SQL_CHAT_LIST_DB_QUERY = '''
SELECT chat_view._id,
chat_view.raw_string_jid,
chat_view.display_message_row_id,
chat_view.last_message_row_id,
chat_view.growth_lock_level,
wa.wa_contacts._id as wa_con_id,
wa.wa_contacts.jid as wa_con_jid,
wa.wa_contacts.display_name as wa_con_display_name,
wa.wa_contacts.status as wa_con_status,
jid._id as jid_id,
jid.user as jid_user,
message._id as msg_v_id,
message.from_me as msg_from_me,
message.timestamp as msg_timestamp,
message.received_timestamp as msg_rcv_timestamp,
message.message_type as msg_type,
message.text_data as msg_data,
message_system.action_type as msg_sys_action_type
FROM
chat_view LEFT JOIN wa.wa_contacts ON chat_view.raw_string_jid = wa.wa_contacts.jid
LEFT JOIN jid ON wa.wa_contacts.jid=jid.raw_string
LEFT JOIN message ON chat_view.last_message_row_id=message._id
LEFT JOIN message_system ON message._id = message_system.message_row_id

WHERE last_message_row_id NOTNULL
ORDER BY last_message_row_id DESC;
'''

SQL_MESSAGES_DB_QUERY_OLD = '''
SELECT 
message._id,
message.chat_row_id,
message.from_me,
message.key_id,
message.sender_jid_row_id,
message.status,
message.broadcast,
message.recipient_count,
message.participant_hash,
message.origination_flags,
message.origin,
message.timestamp,
message.received_timestamp,
message.receipt_server_timestamp,
message.message_type,
message.text_data,
message.starred,
message.lookup_tables,
message.sort_id,
message.message_add_on_flags,
jid.user as jid_user,
jid.raw_string as jid_raw_string,
wa.wa_contacts.display_name as wa_display_name,
CASE
WHEN message.lookup_tables = 2 THEN (
SELECT message_thumbnail.thumbnail FROM message_thumbnail WHERE
message_thumbnail.message_row_id = (SELECT message._id FROM message WHERE message.key_id = message_quoted.key_id)
)
ELSE message_thumbnail.thumbnail
END AS thumbnail,
message_text.description as message_text_description,
message_text.page_title as message_text_page_title,
message_text.url as message_text_url,
message_text.preview_type as message_text_preview_type,
message_forwarded.message_row_id as is_forwarded,
message_forwarded.forward_score as forward_count
FROM
(((((message LEFT JOIN jid ON message.sender_jid_row_id=jid._id)
LEFT JOIN wa.wa_contacts ON jid.raw_string=wa.wa_contacts.jid)
LEFT JOIN message_thumbnail on message._id=message_thumbnail.message_row_id)
LEFT JOIN message_text on message._id=message_text.message_row_id)
LEFT JOIN message_forwarded on message._id=message_forwarded.message_row_id)
'''

SQL_MESSAGES_DB_QUERY = '''
SELECT
message.*,
message_system.action_type as msg_sys_action_type,
jid.user as jid_user,
jid.server as jid_server,
jid.agent as jid_agent,
jid.device as jid_device,
jid.type as jid_type,
jid.raw_string as jid_raw_string,
wa.wa_contacts.display_name as wa_display_name,
message_forwarded.message_row_id as is_msg_forwarded,
message_quoted.from_me as message_quoted_from_me,
message_quoted.sender_jid_row_id as message_quoted_sender_jid_row_id,
message_quoted.key_id as message_quoted_key_id,
message_quoted.message_type as message_quoted_message_type,
message_quoted.text_data as message_quoted_text_data,
message_text.description as message_text_description,
message_text.page_title as message_text_page_title,
message_text.url as message_text_url,
message_text.preview_type as message_text_preview_type,
CASE
WHEN message.lookup_tables = 2 THEN (
SELECT message_thumbnail.thumbnail FROM message_thumbnail WHERE
message_thumbnail.message_row_id = (SELECT message._id FROM message WHERE message.key_id = message_quoted.key_id)
)
ELSE message_thumbnail.thumbnail
END AS thumbnail,
message_media.file_path as media_file_path,
message_media.file_size as media_file_size,
message_media.media_key as media_media_key,
message_media.width as media_width,
message_media.height as media_height,
message_media.message_url as media_message_url,
message_media.mime_type as media_mime_type,
message_media.media_name as media_media_name,
message_media.media_duration as media_media_duration,
message_media.media_caption as media_media_caption,
message_quoted_media.file_path as media_quoted_file_path,
message_quoted_media.file_size as media_quoted_file_size,
message_quoted_media.media_key as media_quoted_media_key,
message_quoted_media.width as media_quoted_width,
message_quoted_media.height as media_quoted_height,
message_quoted_media.message_url as media_quoted_message_url,
message_quoted_media.mime_type as media_quoted_mime_type,
message_quoted_media.media_name as media_quoted_media_name,
message_quoted_media.media_duration as media_quoted_media_duration,
message_quoted_media.media_caption as media_quoted_media_caption,
message_location.latitude AS location_latitude,
message_location.longitude AS location_longitude,
message_location.live_location_share_duration AS location_live_location_share_duration,
message_location.live_location_final_latitude AS location_live_location_final_latitude,
message_location.live_location_final_longitude AS location_live_location_final_longitude,
message_location.live_location_final_timestamp AS location_live_location_final_timestamp
FROM message
LEFT JOIN message_system ON message._id = message_system.message_row_id
LEFT JOIN jid ON message.sender_jid_row_id=jid._id
LEFT JOIN wa.wa_contacts ON jid.raw_string=wa.wa_contacts.jid
LEFT JOIN message_forwarded ON message._id=message_forwarded.message_row_id
LEFT JOIN message_quoted ON message._id=message_quoted.message_row_id
LEFT JOIN message_text ON message._id=message_text.message_row_id
LEFT JOIN message_thumbnail ON message._id=message_thumbnail.message_row_id
LEFT JOIN message_media ON message._id=message_media.message_row_id
LEFT JOIN message_quoted_media ON message._id=message_quoted_media.message_row_id
LEFT JOIN message_location ON message._id=message_location.message_row_id
'''

