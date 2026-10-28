"use client";

import React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RepositoryPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

// Page numbers with the first/last page always visible and ellipses around the current window.
const getPageNumbers = (page: number, totalPages: number): (number | "ellipsis-start" | "ellipsis-end")[] => {
  const pages: (number | "ellipsis-start" | "ellipsis-end")[] = [];
  const maxVisible = 5;

  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    if (start > 2) pages.push("ellipsis-start");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push("ellipsis-end");
    pages.push(totalPages);
  }
  return pages;
};

export function RepositoryPagination({ page, totalPages, onPageChange }: RepositoryPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1">
      <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page === 1}>
        <ChevronLeft /> Previous
      </Button>
      <div className="hidden items-center gap-1 sm:flex">
        {getPageNumbers(page, totalPages).map((pageNumber) =>
          typeof pageNumber === "number" ? (
            <Button
              key={pageNumber}
              variant={pageNumber === page ? "outline" : "ghost"}
              size="icon-sm"
              className="tabular-nums"
              aria-current={pageNumber === page ? "page" : undefined}
              onClick={() => onPageChange(pageNumber)}
            >
              {pageNumber}
            </Button>
          ) : (
            <span key={pageNumber} aria-hidden className="flex size-8 items-center justify-center text-muted-foreground">
              <MoreHorizontal className="size-4" />
            </span>
          )
        )}
      </div>
      <span className="px-2 text-sm text-muted-foreground tabular-nums sm:hidden">
        {page} / {totalPages}
      </span>
      <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>
        Next <ChevronRight />
      </Button>
    </nav>
  );
}
