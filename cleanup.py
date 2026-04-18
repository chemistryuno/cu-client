import re

with open('backend/game/manager.go', 'r', encoding='utf-8') as f:
    content = f.read()

# Apply the previous 4 fixes
content = content.replace('''				if gr.Room.IsDuel && targetUID == gr.Room.TargetUID {
					if winnerUID == gr.Room.ChallengerUID {
						totalBountyForWinner += bounty.Amount
						repository.BountyRepo.UpdateStatus(bounty.ID, "claimed")
					} else if winnerUID == gr.Room.TargetUID {
						reward := bounty.Amount / 2
						totalBountyForWinner += reward
						repository.BountyRepo.UpdateStatus(bounty.ID, "claimed")
					}
				} else {''', '''				if gr.Room.IsDuel && targetUID == gr.Room.TargetUID {
					switch winnerUID {
					case gr.Room.ChallengerUID:
						totalBountyForWinner += bounty.Amount
						repository.BountyRepo.UpdateStatus(bounty.ID, "claimed")
					case gr.Room.TargetUID:
						reward := bounty.Amount / 2
						totalBountyForWinner += reward
						repository.BountyRepo.UpdateStatus(bounty.ID, "claimed")
					}
				} else {''')

content = content.replace('if err := initTutorialGame(gameRoom, roomID); err != nil {', 'if err := initTutorialGame(gameRoom); err != nil {')
content = content.replace('func initTutorialGame(gameRoom *GameRoom, roomID string) error {', 'func initTutorialGame(gameRoom *GameRoom) error {')

content = content.replace('''			if rank == 1 {
				earnedPoints = 100
			} else if rank == 2 {
				earnedPoints = 50
			} else if rank == 3 {
				earnedPoints = 33
			} else {
				earnedPoints = 25
			}''', '''			switch rank {
			case 1:
				earnedPoints = 100
			case 2:
				earnedPoints = 50
			case 3:
				earnedPoints = 33
			default:
				earnedPoints = 25
			}''')

content = content.replace('''	if activeEffect == "+2" || activeEffect == "+4" {
		// 叠加加牌累计
		gameRoom.GameState.PendingDrawCount += map[string]int{"+2": 2, "+4": 4}[activeEffect]
		gameRoom.GameState.PendingDrawTypes = append(gameRoom.GameState.PendingDrawTypes, activeEffect)
		// 传递至下家
		gameRoom.GameState.CurrentPlayer = getNextPlayer(gameRoom.GameState)
	} else if activeEffect == "Au" {
		// Au 效果：清空场面且跳过一人
		gameRoom.GameState.LastCard = nil
		skippedIdx := getNextPlayer(gameRoom.GameState)

		// 暂时移动到被跳过的玩家，以便下一步 getNextPlayer 能找到正确的人
		gameRoom.GameState.CurrentPlayer = skippedIdx
		targetIdx := getNextPlayer(gameRoom.GameState)

		gameRoom.GameState.CurrentPlayer = targetIdx
		gameRoom.GameState.AllowedAnyPlayer = targetIdx

		if websocket.GlobalHub != nil {
			skippedPlayer := gameRoom.GameState.Players[skippedIdx].Nickname
			nextPlayer := gameRoom.GameState.Players[targetIdx].Nickname
			websocket.GlobalHub.BroadcastToRoom(gameRoom.Room.ID, websocket.Message{
				Type: "action_toast",
				Data: fmt.Sprintf("Au 金元素触发！跳过研究员 %s，等待 %s 出牌...", skippedPlayer, nextPlayer),
			})
		}
	} else if activeEffect == "skip" {
		// 稀有气体跳过效果
		skippedIdx := getNextPlayer(gameRoom.GameState)
		gameRoom.GameState.CurrentPlayer = skippedIdx
		targetIdx := getNextPlayer(gameRoom.GameState)
		gameRoom.GameState.CurrentPlayer = targetIdx

		if websocket.GlobalHub != nil {
			skippedPlayer := gameRoom.GameState.Players[skippedIdx].Nickname
			nextPlayer := gameRoom.GameState.Players[targetIdx].Nickname
			websocket.GlobalHub.BroadcastToRoom(gameRoom.Room.ID, websocket.Message{
				Type: "action_toast",
				Data: fmt.Sprintf("稀有气体具有稳定性！跳过研究员 %s，轮到 %s 出牌...", skippedPlayer, nextPlayer),
			})
		}
	} else {
		// 转向效果及常规回合转移
		if activeEffect == "reverse" {''', '''	switch activeEffect {
	case "+2", "+4":
		// 叠加加牌累计
		gameRoom.GameState.PendingDrawCount += map[string]int{"+2": 2, "+4": 4}[activeEffect]
		gameRoom.GameState.PendingDrawTypes = append(gameRoom.GameState.PendingDrawTypes, activeEffect)
		// 传递至下家
		gameRoom.GameState.CurrentPlayer = getNextPlayer(gameRoom.GameState)
	case "Au":
		// Au 效果：清空场面且跳过一人
		gameRoom.GameState.LastCard = nil
		skippedIdx := getNextPlayer(gameRoom.GameState)

		// 暂时移动到被跳过的玩家，以便下一步 getNextPlayer 能找到正确的人
		gameRoom.GameState.CurrentPlayer = skippedIdx
		targetIdx := getNextPlayer(gameRoom.GameState)

		gameRoom.GameState.CurrentPlayer = targetIdx
		gameRoom.GameState.AllowedAnyPlayer = targetIdx

		if websocket.GlobalHub != nil {
			skippedPlayer := gameRoom.GameState.Players[skippedIdx].Nickname
			nextPlayer := gameRoom.GameState.Players[targetIdx].Nickname
			websocket.GlobalHub.BroadcastToRoom(gameRoom.Room.ID, websocket.Message{
				Type: "action_toast",
				Data: fmt.Sprintf("Au 金元素触发！跳过研究员 %s，等待 %s 出牌...", skippedPlayer, nextPlayer),
			})
		}
	case "skip":
		// 稀有气体跳过效果
		skippedIdx := getNextPlayer(gameRoom.GameState)
		gameRoom.GameState.CurrentPlayer = skippedIdx
		targetIdx := getNextPlayer(gameRoom.GameState)
		gameRoom.GameState.CurrentPlayer = targetIdx

		if websocket.GlobalHub != nil {
			skippedPlayer := gameRoom.GameState.Players[skippedIdx].Nickname
			nextPlayer := gameRoom.GameState.Players[targetIdx].Nickname
			websocket.GlobalHub.BroadcastToRoom(gameRoom.Room.ID, websocket.Message{
				Type: "action_toast",
				Data: fmt.Sprintf("稀有气体具有稳定性！跳过研究员 %s，轮到 %s 出牌...", skippedPlayer, nextPlayer),
			})
		}
	default:
		// 转向效果及常规回合转移
		if activeEffect == "reverse" {''')


# Remove multiplayer functions from manager.go
# Delete JoinRoomWithKeyAsSpectator completely
content = re.sub(r'// JoinRoomWithKeyAsSpectator[\s\S]*?^}$', '', content, flags=re.MULTILINE)
# Delete JoinRoomWithKey completely
content = re.sub(r'// JoinRoomWithKey 加入房间（带密码验证）[\s\S]*?^}$', '', content, flags=re.MULTILINE)

with open('backend/game/manager.go', 'w', encoding='utf-8') as f:
    f.write(content)
