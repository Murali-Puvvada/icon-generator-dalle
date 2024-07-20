import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { env } from "~/env.mjs";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import AWS from "aws-sdk";

const s3 = new AWS.S3({
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = "murali-icon-generator-dalle";

interface UnsplashResponse {
  urls: {
    thumb: string;
  };
}

async function fetchImageAsBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  const blob = await response.blob();
  return blob;
}

async function blobToBuffer(blob: Blob): Promise<Buffer> {
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadImageToS3(
  buffer: Buffer,
  bucketName: string,
  key: string,
  contentType: string
) {
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  };

  return s3.upload(params).promise();
}

export const generateRouter = createTRPCRouter({
  generateIcon: protectedProcedure
    .input(z.object({ prompt: z.string() })) //Input Validation using Zod
    .mutation(async ({ ctx, input }) => {
      //Procedure with mutation for changing data
      const { count } = await ctx.prisma.user.updateMany({
        where: {
          id: ctx.session.user.id,
          credits: {
            gte: 1,
          },
        },
        data: {
          credits: {
            decrement: 1,
          },
        },
      });

      if (count <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You don't have enough credits",
        });
      }

      const response = (await fetch("https://api.unsplash.com/photos/random", {
        headers: {
          Authorization: `Client-ID ${env.UNSPLASH_API_KEY}`,
        },
      }).then((res) => res.json())) as UnsplashResponse;

      const imageUrl = response.urls.thumb;

      //Create a icon Model before storing the data in s3
      const icon = await ctx.prisma.icon.create({
        data: {
          prompt: input.prompt,
          userId: ctx.session.user.id,
        },
      });

      //Convert image to blob and buffer before sending to s3
      //Because S3 accepts only buffer, array buffer
      try {
        const blob = await fetchImageAsBlob(imageUrl);
        const buffer = await blobToBuffer(blob);

        const result = await uploadImageToS3(
          buffer,
          BUCKET_NAME,
          icon.id,
          blob.type
        );
        console.log("Image uploaded successfully:", result.Location);
      } catch (error) {
        console.error("Error uploading image:", error);
      }

      //Pass the S3 image URL
      return {
        imageUrl: `https://${BUCKET_NAME}.s3.eu-north-1.amazonaws.com/${icon.id}`,
      };
    }),
});
