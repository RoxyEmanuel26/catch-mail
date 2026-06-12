export function getColorFromEmail(email: string): string {
  const colors = [
    "#007AFF", "#34C759", "#FF9500", "#AF52DE",
    "#FF2D55", "#5AC8FA", "#FF3B30", "#FFCC00",
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Secondary mixing step to improve color distribution (L19)
  hash = (hash ^ (hash >>> 16)) * 0x85ebca6b;
  hash = (hash ^ (hash >>> 13)) * 0xc2b2ae35;
  hash = hash ^ (hash >>> 16);
  return colors[Math.abs(hash) % colors.length];
}

export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Copy text to clipboard with modern navigator.clipboard and fallback to execCommand (H12).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    console.warn("navigator.clipboard failed, trying document.execCommand fallback", e);
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    // Prevent scrolling to bottom in iOS/Safari
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  } catch (err) {
    console.error("Clipboard copy failed entirely", err);
    return false;
  }
}
