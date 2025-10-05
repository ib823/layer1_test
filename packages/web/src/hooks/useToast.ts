export const useToast = () => {
  const toast = (props: { title: string; description?: string; variant?: 'default' | 'destructive' }) => {
    console.log('[Toast]', props);
  };
  return { toast };
};
