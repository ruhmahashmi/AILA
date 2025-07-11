import useProcessingStatus from '../hooks/useProcessingStatus';
import LectureResults from './LectureResults';

export default function ProcessingFileStatus({ courseId, fileName }) {
  const { status, result, progress } = useProcessingStatus(courseId, fileName);
  return (
    <div className="mb-6">
      <div className="font-semibold">{fileName}</div>
      <LectureResults status={status} result={result} progress={progress} />
    </div>
  );
}
