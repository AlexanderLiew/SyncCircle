import { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { UserCheck, UserX, Loader2, AlertCircle, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { apiClient, ApiError } from '../lib/api-client';
import {
  API_PATHS,
  ERROR_CODES,
  type TokenValidationResponse,
  type AcceptRejectCancelResponse,
} from '@synccircle/shared';

type InvitationState =
  | { kind: 'loading' }
  | { kind: 'valid'; data: TokenValidationResponse }
  | { kind: 'error'; message: string };

export function Invitation() {
  const { token } = useParams<{ token: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [state, setState] = useState<InvitationState>({ kind: 'loading' });
  const [actionLoading, setActionLoading] = useState<'accept' | 'reject' | null>(null);

  // --- If not authenticated, redirect to login preserving the current URL ---
  if (!authLoading && !isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // --- Validate token on mount ---
  useEffect(() => {
    if (!token || !isAuthenticated) return;

    async function validateToken() {
      try {
        const path = API_PATHS.FRIEND_REQUESTS_VALIDATE_TOKEN.replace(':token', token!);
        const data = await apiClient.get<TokenValidationResponse>(path);
        setState({ kind: 'valid', data });
      } catch (err) {
        if (err instanceof ApiError) {
          const message = getErrorMessage(err);
          setState({ kind: 'error', message });
        } else {
          setState({ kind: 'error', message: 'Something went wrong. Please try again later.' });
        }
      }
    }

    validateToken();
  }, [token, isAuthenticated]);

  // --- Accept handler ---
  async function handleAccept() {
    if (state.kind !== 'valid') return;
    setActionLoading('accept');

    try {
      const path = API_PATHS.FRIEND_REQUESTS_ACCEPT.replace(':requestId', state.data.requestId);
      await apiClient.post<AcceptRejectCancelResponse>(path);
      toast.success('Friend request accepted!');
      navigate('/friends', { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to accept. Please try again.';
      toast.error(message);
      setActionLoading(null);
    }
  }

  // --- Reject handler ---
  async function handleReject() {
    if (state.kind !== 'valid') return;
    setActionLoading('reject');

    try {
      const path = API_PATHS.FRIEND_REQUESTS_REJECT.replace(':requestId', state.data.requestId);
      await apiClient.post<AcceptRejectCancelResponse>(path);
      toast.success('Friend request declined.');
      navigate('/friends', { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to decline. Please try again.';
      toast.error(message);
      setActionLoading(null);
    }
  }

  // --- Loading state (auth or token validation) ---
  if (authLoading || state.kind === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-2xl border border-border p-12 text-center"
        >
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Validating invitation...</p>
        </motion.div>
      </div>
    );
  }

  // --- Error state ---
  if (state.kind === 'error') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-12 text-center max-w-md"
        >
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Invalid Invitation</h2>
          <p className="text-muted-foreground mb-6">{state.message}</p>
          <button
            onClick={() => navigate('/friends', { replace: true })}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:shadow-lg transition-all"
          >
            Go to Friends
          </button>
        </motion.div>
      </div>
    );
  }

  // --- Valid invitation ---
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border p-12 text-center max-w-md w-full"
      >
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Friend Invitation</h2>
        <p className="text-muted-foreground mb-6">
          <span className="font-medium text-foreground">{state.data.senderDisplayName}</span>{' '}
          wants to be your study buddy on SyncCircle!
        </p>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleAccept}
            disabled={actionLoading !== null}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {actionLoading === 'accept' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserCheck className="w-4 h-4" />
            )}
            Accept
          </button>
          <button
            onClick={handleReject}
            disabled={actionLoading !== null}
            className="px-6 py-3 rounded-xl bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {actionLoading === 'reject' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserX className="w-4 h-4" />
            )}
            Decline
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// --- Helper: Map API error codes to user-friendly messages ---
function getErrorMessage(err: ApiError): string {
  switch (err.code) {
    case ERROR_CODES.TOKEN_EXPIRED:
      return 'This invitation has expired.';
    case ERROR_CODES.TOKEN_USED:
      return 'This invitation has already been responded to.';
    case ERROR_CODES.WRONG_RECIPIENT:
      return 'This invitation was sent to a different account.';
    case ERROR_CODES.NOT_FOUND:
      return 'Invitation not found.';
    default:
      return err.message || 'Something went wrong. Please try again later.';
  }
}
