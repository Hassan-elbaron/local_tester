"""
Main Entry Point - نقطة الدخول الرئيسية
"""

from orchestrator import MasterOrchestrator
import json


def main():
    print("=" * 70)
    print("   AI Marketing Operating System (Production-Ready v2)")
    print("=" * 70)
    
    # إنشاء المنسق الرئيسي
    orchestrator = MasterOrchestrator()
    
    # معاملات الحملة
    goal = "Launch eco-friendly running shoes with 1000 sales in Q3"
    product = "EcoStride Running Shoes"
    market = "US Urban Millennials"
    budget = 50000.0
    constraints = [
        "No aggressive sales tactics",
        "Must highlight recycled materials",
        "Comply with FTC guidelines"
    ]
    
    print(f"\n[Campaign] Product: {product}")
    print(f"[Campaign] Goal: {goal}")
    print(f"[Campaign] Budget: ${budget:,.2f}")
    print(f"[Campaign] Market: {market}")
    print("-" * 70)
    
    # تشغيل الحملة
    campaign_plan = orchestrator.run_campaign(
        goal=goal,
        product=product,
        market=market,
        budget=budget,
        constraints=constraints
    )
    
    # طباعة النتائج
    print("\n" + "=" * 70)
    print("                    CAMPAIGN PLAN SUMMARY")
    print("=" * 70)
    
    print(f"\nCampaign ID: {campaign_plan.campaign_id}")
    print(f"Status: {campaign_plan.status}")
    print(f"Total Tasks: {len(campaign_plan.tasks)}")
    print(f"Completed Tasks: {len([t for t in campaign_plan.tasks if t.status.value == 'completed'])}")
    
    print("\n--- Strategy ---")
    if "strategy" in campaign_plan.results:
        strategy = campaign_plan.results["strategy"].output
        print(f"Positioning: {strategy.get('positioning', 'N/A')}")
        print(f"Messaging Pillars: {', '.join(strategy.get('messaging_pillars', []))}")
    
    print("\n--- Campaign Structure ---")
    if "campaign" in campaign_plan.results:
        campaign = campaign_plan.results["campaign"].output
        print(f"Structure: {campaign.get('campaign_structure', {}).get('phases', 'N/A')}")
        channels = campaign.get('channel_mapping', {})
        for channel, purpose in channels.items():
            print(f"  - {channel}: {purpose}")
    
    print("\n--- Budget Allocation ---")
    if "budget" in campaign_plan.results:
        budget_data = campaign_plan.results["budget"].output
        allocation = budget_data.get('allocation', {})
        for channel, amount in allocation.items():
            print(f"  - {channel}: ${amount:,.2f}")
    
    print("\n--- KPIs ---")
    if "analytics" in campaign_plan.results:
        analytics = campaign_plan.results["analytics"].output
        kpis = analytics.get('kpi_framework', [])
        print(f"KPIs: {', '.join(kpis)}")
    
    print("\n--- Compliance Status ---")
    if "compliance" in campaign_plan.results:
        compliance = campaign_plan.results["compliance"].output
        print(f"Approved: {compliance.get('approved', False)}")
        print(f"Compliance Score: {compliance.get('compliance_score', 0):.2f}")
    
    # طباعة الإحصائيات
    print("\n" + "=" * 70)
    print("                    SYSTEM STATISTICS")
    print("=" * 70)
    
    stats = orchestrator.get_system_statistics()
    
    print("\n--- Router Statistics ---")
    router_stats = stats.get("router_statistics", {})
    print(f"Total Routings: {router_stats.get('total_routings', 0)}")
    
    print("\n--- Memory Statistics ---")
    memory_stats = stats.get("memory_statistics", {})
    print(f"Stored Contexts: {memory_stats.get('context_memory', {}).get('stored_contexts', 0)}")
    print(f"Cache Hit Rate: {memory_stats.get('results_cache', {}).get('hit_rate', 0):.1f}%")
    print(f"Total Decisions: {memory_stats.get('decision_log', {}).get('total_decisions', 0)}")
    
    print("\n--- Agent Statistics ---")
    agent_stats = stats.get("agents_statistics", {})
    for agent_name, agent_stat in agent_stats.items():
        print(f"\n{agent_name}:")
        print(f"  Executions: {agent_stat.get('execution_count', 0)}")
        print(f"  Avg Time: {agent_stat.get('average_execution_time_ms', 0):.2f}ms")
    
    # حفظ النتائج
    print("\n" + "=" * 70)
    print("                    SAVING RESULTS")
    print("=" * 70)
    
    with open("campaign_plan_v2.json", "w") as f:
        json.dump(campaign_plan.dict(), f, indent=2, default=str)
    print("\n✓ Saved: campaign_plan_v2.json")
    
    with open("system_statistics.json", "w") as f:
        json.dump(stats, f, indent=2, default=str)
    print("✓ Saved: system_statistics.json")
    
    print("\n" + "=" * 70)
    print("                    CAMPAIGN COMPLETE!")
    print("=" * 70)


if __name__ == "__main__":
    main()
