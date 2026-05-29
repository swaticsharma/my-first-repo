'use client';

import { Trash2 } from 'lucide-react';

export function DeleteProductButton({
  action,
  productId,
}: {
  action: (formData: FormData) => Promise<void>;
  productId: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm('Delete this product? This cannot be undone.')) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={productId} />
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
      >
        <Trash2 className="h-4 w-4" /> Delete
      </button>
    </form>
  );
}
