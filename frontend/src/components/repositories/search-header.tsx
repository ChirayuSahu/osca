"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function SearchHeader({ searchQuery, setSearchQuery }: SearchHeaderProps) {
  return (
    <PageHeader
      title={<>Search <em>GitHub</em></>}
      description="Search your own repositories first, then all of GitHub. Import any public repository into OSCA."
    >
      <div className="relative w-full max-w-xl">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          aria-label="Search GitHub repositories"
          placeholder="Search GitHub — try react hooks, or language:rust topic:cli"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
        />
        {searchQuery && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setSearchQuery("")}
            className="absolute top-1/2 right-0.5 size-7 -translate-y-1/2 text-muted-foreground"
            aria-label="Clear search"
          >
            <X />
          </Button>
        )}
      </div>
    </PageHeader>
  );
}
