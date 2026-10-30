DROP TABLE IF EXISTS server_emojis;
UPDATE roles SET permissions = permissions & ~32768;
UPDATE channel_overwrites SET allow = allow & ~32768, deny = deny & ~32768;
