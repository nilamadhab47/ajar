"use client";

import { ArrowLeft, ChevronDown, Hash, MessageSquareReply, Paperclip, Search, SendHorizontal, SmilePlus, User, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AvatarImage } from "@/components/common/AvatarImage";
import { EmptyState } from "@/components/common/LoadingState";
import { SearchInput } from "@/components/common/SearchInput";
import { IconButton } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from "@/components/ui/menu";
import { currentUserId } from "@/features/people/people-store";
import { useAllUsers } from "@/features/people/use-people";
import { cn, formatTime } from "@/lib/utils";
import type { ChatAttachment, ChatChannel, ChatMessage, User as UserModel } from "@/types/domain";
import { useChatStore } from "../chat-store";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "👀"];
const channelLabel = (c: ChatChannel) => (c.kind === "channel" ? `#${c.name}` : c.name);
const ChannelIcon = ({ kind }: { kind: ChatChannel["kind"] }) => {
  const Icon = kind === "channel" ? Hash : kind === "group" ? Users : User;
  return <Icon className="size-3.5 shrink-0 text-muted" aria-hidden />;
};

function ChannelPicker() {
  const channels = useChatStore((s) => s.channels);
  const unread = useChatStore((s) => s.unread);
  const activeId = useChatStore((s) => s.activeChannelId);
  const active = channels.find((c) => c.id === activeId);
  const groups: [string, ChatChannel[]][] = [
    ["Channels", channels.filter((c) => c.kind === "channel")],
    ["Group conversations", channels.filter((c) => c.kind === "group")],
    ["Direct messages", channels.filter((c) => c.kind === "dm")],
  ];
  const otherUnread = Object.entries(unread).reduce((n, [id, count]) => n + (id === activeId ? 0 : count), 0);
  return (
    <Menu>
      <MenuTrigger asChild>
        <button type="button" aria-label="Switch conversation" className="flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-md border border-line px-2 text-left text-[13px] font-semibold hover:bg-hover">
          {active && <ChannelIcon kind={active.kind} />}
          <span className="min-w-0 flex-1 truncate">{active ? active.name : "Choose a conversation"}</span>
          {otherUnread > 0 && <span className="rounded-full bg-coral px-1.5 text-[10px] font-semibold leading-4 text-white">{otherUnread}</span>}
          <ChevronDown className="size-3.5 text-muted" aria-hidden />
        </button>
      </MenuTrigger>
      <MenuContent className="w-64">
        {groups.map(([label, items]) => items.length > 0 && (
          <div key={label}>
            <MenuLabel>{label}</MenuLabel>
            {items.map((c) => (
              <MenuItem key={c.id} onSelect={() => useChatStore.getState().setActive(c.id)} className={cn(c.id === activeId && "bg-accent-soft")}>
                <ChannelIcon kind={c.kind} />
                <span className={cn("truncate", unread[c.id] > 0 && "font-semibold")}>{c.name}</span>
                {unread[c.id] > 0 && <span className="ml-auto rounded-full bg-coral px-1.5 text-[10px] font-semibold leading-4 text-white">{unread[c.id]}</span>}
              </MenuItem>
            ))}
          </div>
        ))}
      </MenuContent>
    </Menu>
  );
}

function Message({ message, sender, replies, onOpenThread, compact }: { message: ChatMessage; sender: UserModel | undefined; replies?: number; onOpenThread?: () => void; compact?: boolean }) {
  const toggle = (emoji: string) => useChatStore.getState().toggleReaction(message.channelId, message.id, emoji);
  return (
    <li className="group relative flex gap-2.5 rounded-md px-2 py-1.5 hover:bg-hover">
      {sender ? <AvatarImage avatar={sender.avatar} size={compact ? 24 : 30} className="mt-0.5" /> : <span className="mt-0.5 size-[30px] shrink-0 rounded-md bg-hover" />}
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-1.5">
          <span className="truncate text-[13px] font-semibold">{message.senderId === currentUserId() ? "You" : (sender?.displayName ?? "Former member")}</span>
          <time className="shrink-0 text-[11px] text-muted" dateTime={new Date(message.timestamp).toISOString()}>{formatTime(message.timestamp)}</time>
        </p>
        {message.message && <p className="whitespace-pre-wrap break-words text-[13px] leading-snug">{message.message}</p>}
        {message.attachments?.map((a) => (
          <span key={a.name} className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded border border-line bg-panel px-1.5 py-0.5 text-xs">
            <Paperclip className="size-3 text-muted" aria-hidden />
            <span className="truncate">{a.name}</span>
            <span className="text-muted">{Math.max(1, Math.round(a.size / 1024))} KB</span>
          </span>
        ))}
        {(message.reactions.length > 0 || !!replies) && (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {message.reactions.map((r) => {
              const mine = r.userIds.includes(currentUserId());
              return (
                <button key={r.emoji} type="button" aria-pressed={mine} aria-label={`${r.emoji} ${r.userIds.length} reactions`} onClick={() => toggle(r.emoji)}
                  className={cn("inline-flex h-5 items-center gap-1 rounded-full border px-1.5 text-[11px]", mine ? "border-accent bg-accent-soft text-accent" : "border-line bg-panel hover:bg-hover")}>
                  {r.emoji} <span className="tabular-nums">{r.userIds.length}</span>
                </button>
              );
            })}
            {!!replies && onOpenThread && (
              <button type="button" onClick={onOpenThread} className="text-[11px] font-medium text-accent hover:underline">{replies} {replies === 1 ? "reply" : "replies"}</button>
            )}
          </div>
        )}
      </div>
      <div className="absolute -top-2.5 right-1.5 hidden items-center rounded-md border border-line bg-panel p-0.5 shadow-float group-focus-within:flex group-hover:flex">
        {QUICK_REACTIONS.slice(0, 3).map((e) => (
          <button key={e} type="button" aria-label={`React with ${e}`} onClick={() => toggle(e)} className="flex size-6 items-center justify-center rounded text-sm hover:bg-hover">{e}</button>
        ))}
        <Menu>
          <MenuTrigger asChild>
            <button type="button" aria-label="More reactions" className="flex size-6 items-center justify-center rounded text-muted hover:bg-hover hover:text-ink"><SmilePlus className="size-3.5" /></button>
          </MenuTrigger>
          <MenuContent align="end" className="flex min-w-0 gap-0.5">
            {QUICK_REACTIONS.map((e) => <MenuItem key={e} className="px-1.5 text-base" onSelect={() => toggle(e)}>{e}</MenuItem>)}
          </MenuContent>
        </Menu>
        {onOpenThread && (
          <button type="button" aria-label="Reply in thread" onClick={onOpenThread} className="flex size-6 items-center justify-center rounded text-muted hover:bg-hover hover:text-ink"><MessageSquareReply className="size-3.5" /></button>
        )}
      </div>
    </li>
  );
}

function Composer({ placeholder, onSend }: { placeholder: string; onSend: (text: string, attachments: ChatAttachment[]) => void }) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const canSend = text.trim().length > 0 || attachments.length > 0;
  const submit = () => {
    if (!canSend) return;
    onSend(text, attachments);
    setText("");
    setAttachments([]);
  };
  return (
    <form className="border-t border-line p-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      {attachments.length > 0 && (
        <ul className="mb-1.5 flex flex-wrap gap-1">
          {attachments.map((a) => (
            <li key={a.name} className="inline-flex items-center gap-1 rounded border border-line bg-app px-1.5 py-0.5 text-xs">
              <Paperclip className="size-3 text-muted" aria-hidden />
              <span className="max-w-36 truncate">{a.name}</span>
              <button type="button" aria-label={`Remove ${a.name}`} onClick={() => setAttachments((list) => list.filter((x) => x !== a))} className="text-muted hover:text-ink"><X className="size-3" /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-end gap-1 rounded-md border border-line bg-app px-1 py-1 focus-within:border-accent focus-within:bg-panel">
        <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => {
          const files = Array.from(e.target.files ?? []).map((f) => ({ name: f.name, size: f.size }));
          setAttachments((list) => [...list, ...files].slice(0, 5));
          e.target.value = "";
        }} />
        <IconButton label="Attach files" hint="Names only in demo" className="size-7" onClick={() => fileRef.current?.click()}><Paperclip className="size-3.5" /></IconButton>
        <label className="sr-only" htmlFor={`composer-${placeholder}`}>{placeholder}</label>
        <textarea
          id={`composer-${placeholder}`} value={text} rows={Math.min(5, Math.max(1, text.split("\n").length))} placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          className="max-h-28 min-h-7 flex-1 resize-none bg-transparent px-1 py-1 text-[13px] leading-snug placeholder:text-muted focus:outline-none"
        />
        <IconButton label="Send" hint="Enter" type="submit" disabled={!canSend} className={cn("size-7", canSend && "bg-accent text-white hover:bg-accent-strong hover:text-white")}><SendHorizontal className="size-3.5" /></IconButton>
      </div>
      <p className="mt-1 px-1 text-[10px] text-muted">Enter to send · Shift + Enter for a new line</p>
    </form>
  );
}

/** Scrolls to the newest message whenever the list grows or the conversation changes. */
function useStickToBottom(dep: unknown) {
  const ref = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [dep]);
  return ref;
}

export function ChatPanel() {
  const channels = useChatStore((s) => s.channels);
  const messagesByChannel = useChatStore((s) => s.messages);
  const activeId = useChatStore((s) => s.activeChannelId);
  const threadParentId = useChatStore((s) => s.threadParentId);
  const users = useAllUsers();
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const store = useChatStore.getState;

  const channel = channels.find((c) => c.id === activeId);
  const all = useMemo(() => messagesByChannel[activeId] ?? [], [messagesByChannel, activeId]);
  const roots = all.filter((m) => !m.threadParentId);
  const replyCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of all) if (m.threadParentId) counts[m.threadParentId] = (counts[m.threadParentId] ?? 0) + 1;
    return counts;
  }, [all]);
  const parent = threadParentId ? all.find((m) => m.id === threadParentId) : undefined;
  const replies = parent ? all.filter((m) => m.threadParentId === parent.id) : [];
  const listRef = useStickToBottom(`${activeId}:${parent ? replies.length : roots.length}:${parent?.id ?? ""}`);

  // Opening the chat marks the visible conversation as read.
  useEffect(() => {
    useChatStore.getState().setActive(useChatStore.getState().activeChannelId);
  }, []);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return [];
    return Object.values(messagesByChannel).flat().filter((m) => m.message.toLowerCase().includes(q)).sort((a, b) => b.timestamp - a.timestamp).slice(0, 40);
  }, [messagesByChannel, q]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1.5 p-2 pb-1.5">
        {parent ? (
          <>
            <IconButton label="Back to conversation" className="size-8" onClick={() => store().openThread(null)}><ArrowLeft className="size-4" /></IconButton>
            <p className="min-w-0 flex-1 truncate text-[13px] font-semibold">Thread · {channel ? channelLabel(channel) : ""}</p>
          </>
        ) : searching ? (
          <>
            <SearchInput autoFocus label="Search messages" value={query} onChange={setQuery} className="flex-1" />
            <IconButton label="Close search" className="size-8" onClick={() => { setSearching(false); setQuery(""); }}><X className="size-4" /></IconButton>
          </>
        ) : (
          <>
            <ChannelPicker />
            <IconButton label="Search messages" className="size-8" onClick={() => setSearching(true)}><Search className="size-4" /></IconButton>
          </>
        )}
      </div>
      {!parent && !searching && channel?.topic && <p className="truncate px-3 pb-1.5 text-[11px] text-muted">{channel.topic}</p>}

      {searching && q ? (
        <ul className="thin-scroll min-h-0 flex-1 overflow-y-auto px-1 pb-2" aria-label="Search results">
          {results.length === 0 && <EmptyState title="No messages found" hint={`Nothing matches “${query.trim()}”.`} />}
          {results.map((m) => {
            const c = channels.find((x) => x.id === m.channelId);
            return (
              <li key={m.id}>
                <button type="button" className="w-full rounded-md px-2 py-1.5 text-left hover:bg-hover" onClick={() => { store().setActive(m.channelId); if (m.threadParentId) store().openThread(m.threadParentId); setSearching(false); setQuery(""); }}>
                  <span className="flex items-baseline gap-1.5 text-[11px] text-muted">
                    <span className="font-medium text-ink">{users[m.senderId]?.displayName ?? "Unknown"}</span>
                    in {c ? channelLabel(c) : m.channelId} · {formatTime(m.timestamp)}
                  </span>
                  <span className="line-clamp-2 text-[13px]">{m.message}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : parent ? (
        <>
          <ul ref={listRef} className="thin-scroll min-h-0 flex-1 overflow-y-auto px-1 pb-2" aria-label="Thread">
            <Message message={parent} sender={users[parent.senderId]} />
            <li className="my-1 flex items-center gap-2 px-2 text-[11px] text-muted"><span className="h-px flex-1 bg-line" />{replies.length} {replies.length === 1 ? "reply" : "replies"}<span className="h-px flex-1 bg-line" /></li>
            {replies.map((m) => <Message key={m.id} message={m} sender={users[m.senderId]} compact />)}
          </ul>
          <Composer placeholder="Reply in thread" onSend={(text, attachments) => store().send(text, { attachments, threadParentId: parent.id })} />
        </>
      ) : (
        <>
          <ul ref={listRef} className="thin-scroll min-h-0 flex-1 overflow-y-auto px-1 pb-2" aria-label={`Messages in ${channel ? channelLabel(channel) : "conversation"}`}>
            {roots.length === 0 && <EmptyState title="No messages yet" hint={searching ? "Type to search every conversation." : "Say hello to start the conversation."} />}
            {roots.map((m) => <Message key={m.id} message={m} sender={users[m.senderId]} replies={replyCount[m.id]} onOpenThread={() => store().openThread(m.id)} />)}
          </ul>
          <Composer placeholder={channel ? `Message ${channelLabel(channel)}` : "Write a message"} onSend={(text, attachments) => store().send(text, { attachments })} />
        </>
      )}
    </div>
  );
}
