export function extractTimeCapsule(content: string) {
  let unlockDate = null;
  let cleanContent = content;
  const match = content.match(/<!-- TIME_CAPSULE:(.*?) -->/);
  if (match) {
    unlockDate = match[1];
    cleanContent = content.replace(match[0], '').trim();
  }
  return { unlockDate, cleanContent };
}
