import pytest
import asyncio
import time
import psutil
import os
from httpx import AsyncClient
from concurrent.futures import ThreadPoolExecutor
from typing import List, Dict

from app.main import app
from app.core.config import settings


class TestUploadPerformance:
    """测试文件上传性能指标"""

    @pytest.mark.asyncio
    async def test_large_file_processing_time(self, async_client: AsyncClient):
        """测试大文件处理时间（NFR1: <30秒）"""
        # Create a large test file (8MB)
        large_file_content = b"x" * (8 * 1024 * 1024)
        workspace_id = "test-workspace"
        token = "test-token"

        start_time = time.time()

        response = await async_client.post(
            f"/api/v1/workspaces/{workspace_id}/assets/",
            files={"file": ("large_test.pdf", large_file_content, "application/pdf")},
            headers={"Authorization": f"Bearer {token}"}
        )

        end_time = time.time()
        processing_time = end_time - start_time

        # Verify upload successful
        assert response.status_code == 201

        # Verify performance requirement (NFR1)
        assert processing_time < 30, f"Large file processing took {processing_time}s, expected <30s"

        # Log performance metrics
        print(f"Large file (8MB) processing time: {processing_time:.2f}s")

    @pytest.mark.asyncio
    async def test_concurrent_upload_performance(self, async_client: AsyncClient):
        """测试并发上传性能（5个文件 <60秒）"""
        workspace_id = "test-workspace"
        token = "test-token"
        num_files = 5
        file_size = 1024 * 1024  # 1MB each

        async def upload_file(index: int) -> float:
            """上传单个文件并返回耗时"""
            file_content = b"x" * file_size
            start_time = time.time()

            response = await async_client.post(
                f"/api/v1/workspaces/{workspace_id}/assets/",
                files={"file": (f"concurrent_test_{index}.pdf", file_content, "application/pdf")},
                headers={"Authorization": f"Bearer {token}"}
            )

            end_time = time.time()
            assert response.status_code == 201, f"File {index} upload failed"

            return end_time - start_time

        # 并发上传文件
        start_time = time.time()
        upload_tasks = [upload_file(i) for i in range(num_files)]
        upload_times = await asyncio.gather(*upload_tasks)
        total_time = time.time() - start_time

        # 验证并发性能
        assert total_time < 60, f"Concurrent upload took {total_time}s, expected <60s"
        assert all(t < 30 for t in upload_times), "Some files took too long to upload"

        # 计算平均上传速度
        total_data = num_files * file_size / (1024 * 1024)  # MB
        avg_speed = total_data / total_time  # MB/s
        print(f"Concurrent upload: {total_data:.2f}MB in {total_time:.2f}s")
        print(f"Average upload speed: {avg_speed:.2f}MB/s")

    @pytest.mark.asyncio
    async def test_memory_usage_during_upload(self, async_client: AsyncClient):
        """测试上传过程中的内存使用"""
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB

        # Upload multiple files
        file_sizes = [1, 2, 5, 8]  # MB
        workspace_id = "test-workspace"
        token = "test-token"

        for size in file_sizes:
            file_content = b"x" * (size * 1024 * 1024)
            response = await async_client.post(
                f"/api/v1/workspaces/{workspace_id}/assets/",
                files={"file": (f"memory_test_{size}mb.pdf", file_content, "application/pdf")},
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 201

            # Check memory after each upload
            current_memory = process.memory_info().rss / 1024 / 1024
            memory_increase = current_memory - initial_memory

            # Memory increase should not exceed 3x the file size (reasonable limit)
            assert memory_increase < size * 3, \
                f"Memory increased by {memory_increase}MB for {size}MB file, ratio too high"

        # Final memory check
        final_memory = process.memory_info().rss / 1024 / 1024
        total_increase = final_memory - initial_memory
        print(f"Total memory increase: {total_increase:.2f}MB")

        # Memory should be reasonable
        assert total_increase < 100, "Memory usage increased too much"

    @pytest.mark.asyncio
    async def test_file_parsing_performance(self, async_client: AsyncClient):
        """测试文件解析性能"""
        test_cases = [
            ("small.pdf", 100 * 1024, "application/pdf", 5),      # 100KB
            ("medium.pdf", 1024 * 1024, "application/pdf", 10),   # 1MB
            ("large.pdf", 5 * 1024 * 1024, "application/pdf", 20), # 5MB
        ]

        for filename, size, mime_type, max_time in test_cases:
            file_content = b"x" * size
            workspace_id = "test-workspace"
            token = "test-token"

            # Measure parsing time
            start_time = time.time()
            response = await async_client.post(
                f"/api/v1/workspaces/{workspace_id}/assets/",
                files={"file": (filename, file_content, mime_type)},
                headers={"Authorization": f"Bearer {token}"}
            )
            end_time = time.time()

            assert response.status_code == 201

            parsing_time = end_time - start_time
            assert parsing_time < max_time, \
                f"{filename} parsing took {parsing_time}s, expected <{max_time}s"

            # Verify extracted text for PDFs
            if mime_type == "application/pdf":
                data = response.json()
                assert "extracted_text" in data
                assert len(data["extracted_text"]) > 0

            print(f"{filename} ({size/1024/1024:.1f}MB) parsed in {parsing_time:.2f}s")

    @pytest.mark.asyncio
    async def test_api_response_time(self, async_client: AsyncClient):
        """测试API响应时间"""
        workspace_id = "test-workspace"
        token = "test-token"

        # Test GET /assets/ response time
        start_time = time.time()
        response = await async_client.get(
            f"/api/v1/workspaces/{workspace_id}/assets/",
            headers={"Authorization": f"Bearer {token}"}
        )
        get_time = time.time() - start_time

        assert response.status_code == 200
        assert get_time < 0.5, f"GET assets took {get_time}s, expected <0.5s"

        # Test POST /assets/ response time
        file_content = b"x" * 1024  # 1KB file
        start_time = time.time()
        response = await async_client.post(
            f"/api/v1/workspaces/{workspace_id}/assets/",
            files={"file": ("test.pdf", file_content, "application/pdf")},
            headers={"Authorization": f"Bearer {token}"}
        )
        post_time = time.time() - start_time

        assert response.status_code == 201
        assert post_time < 2, f"POST asset took {post_time}s, expected <2s"

        print(f"GET /assets/: {get_time:.3f}s")
        print(f"POST /assets/: {post_time:.3f}s")

    @pytest.mark.asyncio
    async def test_database_query_performance(self, async_client: AsyncClient, db_session):
        """测试数据库查询性能"""
        from app.models.asset import Asset
        from sqlalchemy import select, func

        workspace_id = "test-workspace"

        # Create test assets
        test_assets = []
        for i in range(100):
            asset = Asset(
                filename=f"perf_test_{i}.pdf",
                original_filename=f"Performance Test {i}.pdf",
                content_type="application/pdf",
                file_size=1024,
                workspace_id=workspace_id,
                uploaded_by=1
            )
            test_assets.append(asset)

        db_session.add_all(test_assets)
        await db_session.commit()

        # Test query performance
        start_time = time.time()
        stmt = select(Asset).where(Asset.workspace_id == workspace_id)
        result = await db_session.execute(stmt)
        assets = result.scalars().all()
        query_time = time.time() - start_time

        assert len(assets) == 100
        assert query_time < 0.1, f"Query took {query_time}s, expected <0.1s"

        # Test count query
        start_time = time.time()
        count_stmt = select(func.count(Asset.id)).where(Asset.workspace_id == workspace_id)
        count_result = await db_session.execute(count_stmt)
        count = count_result.scalar()
        count_time = time.time() - start_time

        assert count == 100
        assert count_time < 0.05, f"Count query took {count_time}s, expected <0.05s"

        print(f"Query 100 assets: {query_time:.3f}s")
        print(f"Count query: {count_time:.3f}s")

        # Cleanup
        await db_session.execute(Asset.__table__.delete())
        await db_session.commit()

    @pytest.mark.asyncio
    async def test_system_resources_under_load(self, async_client: AsyncClient):
        """测试系统负载下的性能"""
        process = psutil.Process(os.getpid())
        initial_cpu = process.cpu_percent()
        initial_memory = process.memory_info().rss / 1024 / 1024

        # Simulate heavy load
        num_requests = 50
        concurrent_limit = 10

        async def make_request(index: int):
            file_content = b"x" * (100 * 1024)  # 100KB
            return await async_client.post(
                "/api/v1/workspaces/test-workspace/assets/",
                files={"file": (f"load_test_{index}.pdf", file_content, "application/pdf")},
                headers={"Authorization": "Bearer test-token"}
            )

        # Execute requests in batches
        start_time = time.time()
        for i in range(0, num_requests, concurrent_limit):
            batch = range(i, min(i + concurrent_limit, num_requests))
            results = await asyncio.gather(*[make_request(j) for j in batch])
            assert all(r.status_code == 201 for r in results), "Some requests failed"

        total_time = time.time() - start_time

        # Check resource usage
        final_cpu = process.cpu_percent()
        final_memory = process.memory_info().rss / 1024 / 1024

        # Verify performance under load
        avg_time_per_request = total_time / num_requests
        assert avg_time_per_request < 1, f"Average time per request: {avg_time_per_request}s, expected <1s"

        # Resource usage should be reasonable
        memory_increase = final_memory - initial_memory
        assert memory_increase < 50, f"Memory increased by {memory_increase}MB, expected <50MB"

        print(f"Processed {num_requests} requests in {total_time:.2f}s")
        print(f"Average time per request: {avg_time_per_request:.3f}s")
        print(f"CPU usage: {final_cpu}%")
        print(f"Memory increase: {memory_increase:.2f}MB")


@pytest.mark.performance
class TestPerformanceRegression:
    """性能回归测试"""

    @pytest.mark.asyncio
    async def test_upload_performance_regression(self, async_client: AsyncClient):
        """确保上传性能不低于基线"""
        baseline_times = {
            "1MB": 5,    # seconds
            "5MB": 10,   # seconds
            "10MB": 20,  # seconds
        }

        for size_str, baseline in baseline_times.items():
            size_bytes = int(float(size_str.replace("MB", "")) * 1024 * 1024)
            file_content = b"x" * size_bytes

            start_time = time.time()
            response = await async_client.post(
                "/api/v1/workspaces/test-workspace/assets/",
                files={"file": (f"regression_test_{size_str}.pdf", file_content, "application/pdf")},
                headers={"Authorization": "Bearer test-token"}
            )
            actual_time = time.time() - start_time

            # Allow 10% tolerance
            tolerance = baseline * 0.1
            assert actual_time < baseline + tolerance, \
                f"Performance regression: {size_str} file took {actual_time:.2f}s, baseline: {baseline}s ±{tolerance:.2f}s"

            print(f"✓ {size_str} file: {actual_time:.2f}s (baseline: {baseline}s)")