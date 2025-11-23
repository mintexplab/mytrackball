# Error Sound Integration

The error sound (`src/assets/error-sound.mp3`) is automatically played throughout the application whenever an error occurs.

## Integration Points

### 1. Form Validation Errors
- **Location**: `src/components/EnhancedCreateRelease.tsx`
- **Trigger**: Any validation error in release submission forms
- Uses the custom toast wrapper that automatically plays the error sound

### 2. Toast Error Messages
- **Location**: `src/lib/toast-with-sound.ts`
- **Trigger**: Any `toast.error()` call throughout the application
- Automatically plays error sound before showing the toast notification

### 3. Maintenance Mode
- **Location**: `src/components/MaintenanceDialog.tsx`
- **Trigger**: When maintenance mode is activated
- Plays when the maintenance dialog appears

### 4. Account Termination
- **Location**: `src/components/TerminatedAccountDialog.tsx`
- **Trigger**: When a user's account is terminated/banned
- Plays when the termination dialog appears

### 5. Security Lock
- **Location**: `src/components/MaintenanceDialog.tsx`
- **Trigger**: When security maintenance mode is enabled
- Plays when security lock dialog appears

## Usage

### In Components
To play the error sound in any component:

```typescript
import { useErrorSound } from '@/hooks/useErrorSound';

const MyComponent = () => {
  const { playErrorSound } = useErrorSound();
  
  // Play sound when needed
  playErrorSound();
};
```

### Outside Components
For standalone functions or edge cases:

```typescript
import { playErrorSound } from '@/hooks/useErrorSound';

// Direct function call
playErrorSound();
```

### With Toast Messages
Simply use `toast.error()` anywhere - the sound will play automatically:

```typescript
import { toast } from '@/lib/toast-with-sound';

toast.error("Something went wrong");
```

## Sound Properties
- Volume: 40%
- Format: MP3
- Location: `src/assets/error-sound.mp3`

## Future Integration Points
Consider adding error sound to:
- Network request failures
- File upload errors
- Permission denied scenarios
- Session timeout warnings
