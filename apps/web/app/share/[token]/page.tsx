import SharedNoteClient from "./SharedNoteClient";

type SharePageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  return <SharedNoteClient token={token} />;
}
