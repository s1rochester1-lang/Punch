import { useAuth } from "../context/AuthContext";

export default function Header({ title }: { title: string }) {
  const { profile, signOut } = useAuth();

  return (
    <div className="flex items-center justify-between px-5 pt-6 pb-2">
      <div>
        <h1 className="text-2xl text-paper leading-none">{title}</h1>
        {profile && (
          <p className="text-muted text-xs font-body normal-case tracking-normal mt-1">
            {profile.full_name} &middot; {profile.role}
          </p>
        )}
      </div>
      <button
        onClick={signOut}
        className="text-xs text-muted font-body normal-case tracking-normal underline"
      >
        Sign out
      </button>
    </div>
  );
}
