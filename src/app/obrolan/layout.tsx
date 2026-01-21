import { ChatLayout } from '@/components/chat/chat-layout';

export default function ObrolanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ChatLayout>{children}</ChatLayout>;
}
