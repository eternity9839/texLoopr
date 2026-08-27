import { appError, appLoading } from "../state/appFeedback";
import { LoadingScreen } from "./LoadingScreen";
import { ErrorWindow } from "./ErrorWindow";

/** Global loading + error overlays (studio and boot). */
export function AppFeedbackHost() {
  const loading = appLoading.value;
  const error = appError.value;
  return (
    <>
      {loading ? (
        <LoadingScreen kind={loading.kind} message={loading.message} />
      ) : null}
      {error ? <ErrorWindow error={error} /> : null}
    </>
  );
}
