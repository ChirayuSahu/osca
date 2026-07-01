/*
  Warnings:

  - You are about to drop the `CommentVote` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RepositoryThread` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ThreadComment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CommentVote" DROP CONSTRAINT "CommentVote_commentId_fkey";

-- DropForeignKey
ALTER TABLE "CommentVote" DROP CONSTRAINT "CommentVote_userId_fkey";

-- DropForeignKey
ALTER TABLE "RepositoryThread" DROP CONSTRAINT "RepositoryThread_authorId_fkey";

-- DropForeignKey
ALTER TABLE "RepositoryThread" DROP CONSTRAINT "RepositoryThread_repositoryId_fkey";

-- DropForeignKey
ALTER TABLE "ThreadComment" DROP CONSTRAINT "ThreadComment_authorId_fkey";

-- DropForeignKey
ALTER TABLE "ThreadComment" DROP CONSTRAINT "ThreadComment_parentId_fkey";

-- DropForeignKey
ALTER TABLE "ThreadComment" DROP CONSTRAINT "ThreadComment_threadId_fkey";

-- DropTable
DROP TABLE "CommentVote";

-- DropTable
DROP TABLE "RepositoryThread";

-- DropTable
DROP TABLE "ThreadComment";
