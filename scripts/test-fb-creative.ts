/**
 * Facebook Marketing API - Test Script for Multiple Text Variations
 *
 * This script tests different payload structures to find one that works
 * for creating ads with multiple primary text and headline variations.
 *
 * Run with: npx tsx scripts/test-fb-creative.ts
 */

const FACEBOOK_API_VERSION = "v24.0";
const FACEBOOK_GRAPH_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

// Test values from user input
const TEST_CONFIG = {
  // Access token from user's test payload
  accessToken: process.env.FB_ACCESS_TOKEN || "EAAZAeSINcSjkBQJZBATp7yRKMloejNKdLRsGsKIrgdPj24ZCejZBRHpudRH0f6zjeLDXZApszEZCakfx998dVaxfWe8QOhVMv3XG9iTvLg637Bq43ohClfIz3vZBzsshZBlVuP3SNBUAY2TaXsqXv9ZA7ll2ZC3XDam2f40kfZC0mQAQzQaRZBlZBKJ1DySvQ5ul9m1qoQXzk0gZDZD",
  adAccountId: "993176812731820", // Hardcoded ad account ID
  adSetId: "120240179612950364", // Ad set ID for testing ad creation
  pageId: "532437443294142",
  instagramUserId: "17841472248034795",
  videoId: "2007623960100993",
  link: "https://familyfriends.com/products/ff01-loving",
  thumbnailUrl: "https://scontent-iad3-1.xx.fbcdn.net/v/t15.5256-10/611782979_887660830439712_4852762285131453197_n.jpg?_nc_cat=101&ccb=1-7&_nc_sid=e3495b&_nc_ohc=aIo4qoHSAvIQ7kNvwH3d5K9&_nc_oc=AdkFqNypD6k9Xryy-MFau0cnqKghW8TuA4UdSm-7arnf3Vae7GlVfEvNOrjKneEXQro&_nc_zt=23&_nc_ht=scontent-iad3-1.xx&edm=APRAPSkEAAAA&_nc_gid=WUUHDpkClKYx0dAf27_jvA&_nc_tpa=Q5bMBQGrG8JF-VuikbbRo82JXhxY6suWN-khBBJ_k7j33YxX_iPs7O-UI1YuUoW-SuZgCTRR5Pl2ALUcTw&oh=00_Afo-qrV8_a-tfiYR98ImyHPLqSIOhhNr6OuDyqasGdVOog&oe=6962CD37",
  primaryTexts: [
    "This seems controversial, but...\n\n\"Good job!\" is accidentally creating a child who works for praise, not out of self-interest. 🗣️\n\n\"It's okay!\" dismisses (instead of validates) a child's feeling when they're hurt or upset. 💔\n\n\"Be careful!\" alerts them to danger but doesn't tell them what to actually do instead. ⚠️\n\nLanguage is a minefield. But when you learn what to say instead, connection is built and cooperation follows...\n\nThat's exactly what The LOVING Approach teaches: the language swaps that build confidence instead of resistance ⬇️",
    "This is an uncomfortable truth, but...\n\nWhen you're triggered, your child's nervous system mirrors yours within seconds. 😔\n\nYour stress hormones create stress hormones in them—it's pure biology. 💥\n\nThe calmer you stay, the faster they can return to regulation. 🔄\n\nChildren can't co-regulate with a dysregulated adult—it's neurologically impossible. 🧠\n\nYou are their emotional thermostat, whether you realize it or not.\n\nWhen you learn to regulate yourself first, you become their calm in any storm.\n\nThat's exactly what The LOVING Approach teaches: how to break the stress cycle and become your child's calm anchor ⬇️",
    "Think about what you got up to as a teenager that your parents still don't know about. 😬 Now imagine your child facing those same challenges alone.\n\nThe relationship patterns you create today don't disappear at age 13. Research shows that parent-child bonds follow patterns established in the early years. ✨\n\nWhat looks like defiance at 4 becomes full-blown opposition at 14 if we don't address it now. 🎯\n\nThat's exactly what we solve with The LOVING Approach: 30-day system that transforms daily battles into lasting connection ⬇️",
  ],
  headlines: [
    "What Your Child Wishes You Knew",
    "Today's Connection = Tomorrow's Trust 🤝",
    "Gentle Parenting That Actually Works",
  ],
  description: "Stop daily battles with your kids. This 30-day program turns defiance into cooperation without yelling, bribes or punishment.",
};

interface TestResult {
  testName: string;
  success: boolean;
  creativeId?: string;
  error?: string;
  errorCode?: number;
  fullResponse?: unknown;
}

async function createCreative(
  testName: string,
  requestBody: Record<string, unknown>
): Promise<TestResult> {
  const url = `${FACEBOOK_GRAPH_URL}/act_${TEST_CONFIG.adAccountId}/adcreatives`;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`TEST: ${testName}`);
  console.log(`${"=".repeat(60)}`);
  console.log(`\nRequest URL: ${url}`);
  console.log(`\nRequest Body:\n${JSON.stringify(requestBody, null, 2)}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...requestBody,
        access_token: TEST_CONFIG.accessToken,
      }),
    });

    const data = await response.json();

    console.log(`\nResponse Status: ${response.status}`);
    console.log(`Response Body:\n${JSON.stringify(data, null, 2)}`);

    if (response.ok && data.id) {
      console.log(`\n✅ SUCCESS! Creative ID: ${data.id}`);
      return {
        testName,
        success: true,
        creativeId: data.id,
        fullResponse: data,
      };
    } else {
      console.log(`\n❌ FAILED: ${data.error?.message || "Unknown error"}`);
      return {
        testName,
        success: false,
        error: data.error?.message,
        errorCode: data.error?.code,
        fullResponse: data,
      };
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.log(`\n❌ EXCEPTION: ${errorMessage}`);
    return {
      testName,
      success: false,
      error: errorMessage,
    };
  }
}

// Base object_story_spec for video ads
function getBaseObjectStorySpec() {
  return {
    page_id: TEST_CONFIG.pageId,
    instagram_user_id: TEST_CONFIG.instagramUserId,
    video_data: {
      video_id: TEST_CONFIG.videoId,
      message: TEST_CONFIG.primaryTexts[0],
      title: TEST_CONFIG.headlines[0],
      link_description: TEST_CONFIG.description,
      image_url: TEST_CONFIG.thumbnailUrl,
      call_to_action: {
        type: "LEARN_MORE",
        value: { link: TEST_CONFIG.link },
      },
    },
  };
}

async function runTests() {
  console.log("\n" + "=".repeat(60));
  console.log("FACEBOOK API MULTIPLE TEXT VARIATIONS TEST SUITE");
  console.log("=".repeat(60));
  console.log(`\nAPI Version: ${FACEBOOK_API_VERSION}`);
  console.log(`Primary Texts: ${TEST_CONFIG.primaryTexts.length}`);
  console.log(`Headlines: ${TEST_CONFIG.headlines.length}`);

  if (!TEST_CONFIG.accessToken || TEST_CONFIG.accessToken === "YOUR_ACCESS_TOKEN_HERE") {
    console.error("\n⚠️  ERROR: Please set FB_ACCESS_TOKEN environment variable or update TEST_CONFIG.accessToken");
    process.exit(1);
  }

  console.log(`\nUsing ad account: ${TEST_CONFIG.adAccountId}`);
  console.log(`Using ad set: ${TEST_CONFIG.adSetId}`);

  const results: TestResult[] = [];

  // Test 1: text_optimizations with customizations field
  results.push(await createCreative(
    "Test 1: text_optimizations with customizations",
    {
      name: `Test Creative - text_optimizations customizations - ${Date.now()}`,
      object_story_spec: getBaseObjectStorySpec(),
      degrees_of_freedom_spec: {
        creative_features_spec: {
          text_optimizations: {
            enroll_status: "OPT_IN",
            customizations: {
              bodies: TEST_CONFIG.primaryTexts.map(text => ({ text })),
              titles: TEST_CONFIG.headlines.map(text => ({ text })),
            },
          },
        },
      },
    }
  ));

  // Test 2: text_optimizations with direct bodies/titles
  results.push(await createCreative(
    "Test 2: text_optimizations with direct bodies/titles",
    {
      name: `Test Creative - text_optimizations direct - ${Date.now()}`,
      object_story_spec: getBaseObjectStorySpec(),
      degrees_of_freedom_spec: {
        creative_features_spec: {
          text_optimizations: {
            enroll_status: "OPT_IN",
            bodies: TEST_CONFIG.primaryTexts.map(text => ({ text })),
            titles: TEST_CONFIG.headlines.map(text => ({ text })),
          },
        },
      },
    }
  ));

  // Test 3: asset_feed_spec without optimization_type
  results.push(await createCreative(
    "Test 3: asset_feed_spec without optimization_type",
    {
      name: `Test Creative - asset_feed_spec basic - ${Date.now()}`,
      object_story_spec: {
        page_id: TEST_CONFIG.pageId,
        instagram_user_id: TEST_CONFIG.instagramUserId,
      },
      asset_feed_spec: {
        bodies: TEST_CONFIG.primaryTexts.map(text => ({ text })),
        titles: TEST_CONFIG.headlines.map(text => ({ text })),
        descriptions: [{ text: TEST_CONFIG.description }],
        videos: [{ video_id: TEST_CONFIG.videoId }],
        link_urls: [{ website_url: TEST_CONFIG.link }],
        call_to_action_types: ["LEARN_MORE"],
      },
    }
  ));

  // Test 4: asset_feed_spec with text_optimizations opt-in
  results.push(await createCreative(
    "Test 4: asset_feed_spec + text_optimizations opt-in",
    {
      name: `Test Creative - asset_feed_spec + text_opt - ${Date.now()}`,
      object_story_spec: {
        page_id: TEST_CONFIG.pageId,
        instagram_user_id: TEST_CONFIG.instagramUserId,
      },
      asset_feed_spec: {
        bodies: TEST_CONFIG.primaryTexts.map(text => ({ text })),
        titles: TEST_CONFIG.headlines.map(text => ({ text })),
        descriptions: [{ text: TEST_CONFIG.description }],
        videos: [{ video_id: TEST_CONFIG.videoId }],
        link_urls: [{ website_url: TEST_CONFIG.link }],
        call_to_action_types: ["LEARN_MORE"],
      },
      degrees_of_freedom_spec: {
        creative_features_spec: {
          text_optimizations: {
            enroll_status: "OPT_IN",
          },
        },
      },
    }
  ));

  // Test 5: Simple text_optimizations opt-in only (baseline)
  results.push(await createCreative(
    "Test 5: Simple text_optimizations opt-in (baseline)",
    {
      name: `Test Creative - text_opt baseline - ${Date.now()}`,
      object_story_spec: getBaseObjectStorySpec(),
      degrees_of_freedom_spec: {
        creative_features_spec: {
          text_optimizations: {
            enroll_status: "OPT_IN",
          },
        },
      },
    }
  ));

  // Test 6: Try with ad_formats in asset_feed_spec
  results.push(await createCreative(
    "Test 6: asset_feed_spec with SINGLE_VIDEO format",
    {
      name: `Test Creative - asset_feed_spec single_video - ${Date.now()}`,
      object_story_spec: {
        page_id: TEST_CONFIG.pageId,
        instagram_user_id: TEST_CONFIG.instagramUserId,
      },
      asset_feed_spec: {
        ad_formats: ["SINGLE_VIDEO"],
        bodies: TEST_CONFIG.primaryTexts.map(text => ({ text })),
        titles: TEST_CONFIG.headlines.map(text => ({ text })),
        descriptions: [{ text: TEST_CONFIG.description }],
        videos: [{ video_id: TEST_CONFIG.videoId }],
        link_urls: [{ website_url: TEST_CONFIG.link }],
        call_to_action_types: ["LEARN_MORE"],
      },
    }
  ));

  // Test 7: Try creating ad directly with inline creative + asset_feed_spec
  console.log("\n" + "=".repeat(60));
  console.log("TEST: Test 7: Direct ad creation with inline asset_feed_spec creative");
  console.log("=".repeat(60));

  try {
    const adResponse = await fetch(
      `${FACEBOOK_GRAPH_URL}/act_${TEST_CONFIG.adAccountId}/ads`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Test Ad - inline asset_feed_spec - ${Date.now()}`,
          adset_id: TEST_CONFIG.adSetId,
          status: "PAUSED",
          creative: {
            name: `Inline Creative - ${Date.now()}`,
            object_story_spec: {
              page_id: TEST_CONFIG.pageId,
              instagram_user_id: TEST_CONFIG.instagramUserId,
            },
            asset_feed_spec: {
              ad_formats: ["SINGLE_VIDEO"],
              bodies: TEST_CONFIG.primaryTexts.map(text => ({ text })),
              titles: TEST_CONFIG.headlines.map(text => ({ text })),
              descriptions: [{ text: TEST_CONFIG.description }],
              videos: [{ video_id: TEST_CONFIG.videoId }],
              link_urls: [{ website_url: TEST_CONFIG.link }],
              call_to_action_types: ["LEARN_MORE"],
            },
          },
          access_token: TEST_CONFIG.accessToken,
        }),
      }
    );
    const adData = await adResponse.json();
    console.log("\nResponse:", JSON.stringify(adData, null, 2));
    if (adData.id) {
      console.log(`\n✅ SUCCESS! Ad created with ID: ${adData.id}`);
      results.push({ testName: "Test 7: Direct ad with inline asset_feed_spec", success: true, creativeId: adData.id });
    } else {
      console.log(`\n❌ FAILED: ${adData.error?.error_user_msg || adData.error?.message}`);
      results.push({ testName: "Test 7: Direct ad with inline asset_feed_spec", success: false, error: adData.error?.message, errorCode: adData.error?.code });
    }
  } catch (err) {
    console.log("Error:", err);
    results.push({ testName: "Test 7: Direct ad with inline asset_feed_spec", success: false, error: String(err) });
  }

  // Test 8: Try ad creation with standard creative + text_generation feature
  console.log("\n" + "=".repeat(60));
  console.log("TEST: Test 8: Standard creative with text_generation (AI variations)");
  console.log("=".repeat(60));

  try {
    const adResponse = await fetch(
      `${FACEBOOK_GRAPH_URL}/act_${TEST_CONFIG.adAccountId}/ads`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Test Ad - text_generation - ${Date.now()}`,
          adset_id: TEST_CONFIG.adSetId,
          status: "PAUSED",
          creative: {
            name: `Creative with text_generation - ${Date.now()}`,
            object_story_spec: {
              page_id: TEST_CONFIG.pageId,
              instagram_user_id: TEST_CONFIG.instagramUserId,
              video_data: {
                video_id: TEST_CONFIG.videoId,
                message: TEST_CONFIG.primaryTexts[0],
                title: TEST_CONFIG.headlines[0],
                link_description: TEST_CONFIG.description,
                image_url: TEST_CONFIG.thumbnailUrl,
                call_to_action: {
                  type: "LEARN_MORE",
                  value: { link: TEST_CONFIG.link },
                },
              },
            },
            degrees_of_freedom_spec: {
              creative_features_spec: {
                text_optimizations: { enroll_status: "OPT_IN" },
                text_generation: { enroll_status: "OPT_IN" },
              },
            },
          },
          access_token: TEST_CONFIG.accessToken,
        }),
      }
    );
    const adData = await adResponse.json();
    console.log("\nResponse:", JSON.stringify(adData, null, 2));
    if (adData.id) {
      console.log(`\n✅ SUCCESS! Ad created with ID: ${adData.id}`);
      results.push({ testName: "Test 8: Standard creative + text_generation", success: true, creativeId: adData.id });
    } else {
      console.log(`\n❌ FAILED: ${adData.error?.error_user_msg || adData.error?.message}`);
      results.push({ testName: "Test 8: Standard creative + text_generation", success: false, error: adData.error?.message, errorCode: adData.error?.code });
    }
  } catch (err) {
    console.log("Error:", err);
    results.push({ testName: "Test 8: Standard creative + text_generation", success: false, error: String(err) });
  }

  // Test 9: Try flexible_spec (newer Flexible Ad approach)
  console.log("\n" + "=".repeat(60));
  console.log("TEST: Test 9: Ad creation with flexible_spec");
  console.log("=".repeat(60));

  try {
    const adResponse = await fetch(
      `${FACEBOOK_GRAPH_URL}/act_${TEST_CONFIG.adAccountId}/ads`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Test Ad - flexible_spec - ${Date.now()}`,
          adset_id: TEST_CONFIG.adSetId,
          status: "PAUSED",
          creative: {
            name: `Creative with flexible_spec - ${Date.now()}`,
            object_story_spec: {
              page_id: TEST_CONFIG.pageId,
              instagram_user_id: TEST_CONFIG.instagramUserId,
              video_data: {
                video_id: TEST_CONFIG.videoId,
                message: TEST_CONFIG.primaryTexts[0],
                title: TEST_CONFIG.headlines[0],
                link_description: TEST_CONFIG.description,
                image_url: TEST_CONFIG.thumbnailUrl,
                call_to_action: {
                  type: "LEARN_MORE",
                  value: { link: TEST_CONFIG.link },
                },
              },
            },
            flexible_spec: {
              bodies: TEST_CONFIG.primaryTexts.map(text => ({ text })),
              titles: TEST_CONFIG.headlines.map(text => ({ text })),
            },
          },
          access_token: TEST_CONFIG.accessToken,
        }),
      }
    );
    const adData = await adResponse.json();
    console.log("\nResponse:", JSON.stringify(adData, null, 2));
    if (adData.id) {
      console.log(`\n✅ SUCCESS! Ad created with ID: ${adData.id}`);
      results.push({ testName: "Test 9: Ad with flexible_spec", success: true, creativeId: adData.id });
    } else {
      console.log(`\n❌ FAILED: ${adData.error?.error_user_msg || adData.error?.message}`);
      results.push({ testName: "Test 9: Ad with flexible_spec", success: false, error: adData.error?.message, errorCode: adData.error?.code });
    }
  } catch (err) {
    console.log("Error:", err);
    results.push({ testName: "Test 9: Ad with flexible_spec", success: false, error: String(err) });
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("TEST SUMMARY");
  console.log("=".repeat(60));

  for (const result of results) {
    const status = result.success ? "✅ SUCCESS" : "❌ FAILED";
    const detail = result.success
      ? `Creative ID: ${result.creativeId}`
      : `Error ${result.errorCode || "N/A"}: ${result.error}`;
    console.log(`\n${status}: ${result.testName}`);
    console.log(`  ${detail}`);
  }

  const successfulTests = results.filter(r => r.success);
  console.log(`\n${"=".repeat(60)}`);
  console.log(`RESULTS: ${successfulTests.length}/${results.length} tests passed`);
  console.log("=".repeat(60));

  if (successfulTests.length > 0) {
    console.log("\n🎉 WORKING APPROACH FOUND!");
    console.log("Next step: Verify in Ads Manager that text variations are visible");

    // Verify the asset_feed_spec creative if it succeeded
    const assetFeedTest = results.find(r => r.testName.includes("asset_feed_spec") && r.testName.includes("SINGLE_VIDEO") && r.success);
    if (assetFeedTest?.creativeId) {
      console.log("\n" + "=".repeat(60));
      console.log("VERIFYING CREATIVE - Checking if text variations are stored");
      console.log("=".repeat(60));

      try {
        const creativeResponse = await fetch(
          `${FACEBOOK_GRAPH_URL}/${assetFeedTest.creativeId}?fields=id,name,asset_feed_spec,object_story_spec&access_token=${TEST_CONFIG.accessToken}`
        );
        const creativeData = await creativeResponse.json();
        console.log("\nCreative details:");
        console.log(JSON.stringify(creativeData, null, 2));

        if (creativeData.asset_feed_spec) {
          const bodies = creativeData.asset_feed_spec.bodies?.length || 0;
          const titles = creativeData.asset_feed_spec.titles?.length || 0;
          console.log(`\n✅ Creative has ${bodies} body variations and ${titles} title variations stored!`);
        }
      } catch (err) {
        console.log("Failed to verify creative:", err);
      }

      // Create an actual ad using this creative
      console.log("\n" + "=".repeat(60));
      console.log("CREATING TEST AD with the working creative");
      console.log("=".repeat(60));

      try {
        const adResponse = await fetch(
          `${FACEBOOK_GRAPH_URL}/act_${TEST_CONFIG.adAccountId}/ads`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: `Test Ad - Multiple Text Variations - ${Date.now()}`,
              adset_id: TEST_CONFIG.adSetId,
              creative: { creative_id: assetFeedTest.creativeId },
              status: "PAUSED",
              access_token: TEST_CONFIG.accessToken,
            }),
          }
        );
        const adData = await adResponse.json();
        console.log("\nAd creation response:");
        console.log(JSON.stringify(adData, null, 2));

        if (adData.id) {
          console.log(`\n✅ AD CREATED SUCCESSFULLY! Ad ID: ${adData.id}`);
          console.log(`\n📋 Check in Ads Manager: https://business.facebook.com/adsmanager/manage/ads?act=${TEST_CONFIG.adAccountId}&selected_ad_ids=${adData.id}`);
        } else {
          console.log(`\n❌ Ad creation failed: ${adData.error?.message}`);
        }
      } catch (err) {
        console.log("Failed to create ad:", err);
      }
    }
  } else {
    console.log("\n😞 No working approach found. Check errors above for clues.");
  }
}

// Run the tests
runTests().catch(console.error);
