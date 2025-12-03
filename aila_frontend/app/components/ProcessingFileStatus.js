// app/components/ProcessingFileStatus.js
import useProcessingStatus from "../hooks/useProcessingStatus";
import ProgressBar from "./ProgressBar";

export default function ProcessingFileStatus({ processingId, fileName }) {
  const { progress, status, error } = useProcessingStatus(processingId);

  return (
    <div className="my-2 p-2 border rounded bg-white">
      <div><strong>{fileName}</strong></div>
      <div>Status: {status}</div>
      {error && <div style={{ color: "red" }}>Error: {error}</div>}
      <ProgressBar progress={progress} status={status} />
    </div>
  );
}
