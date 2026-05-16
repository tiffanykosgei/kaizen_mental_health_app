using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using kaizenbackend.Data;
using kaizenbackend.DTOs;
using kaizenbackend.Models;
using kaizenbackend.Services;

namespace kaizenbackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class JournalController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IJournalEncryptionService _journalEncryption;

        public JournalController(AppDbContext context, IJournalEncryptionService journalEncryption)
        {
            _context = context;
            _journalEncryption = journalEncryption;
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateJournalDto dto)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest("Title is required.");

            if (string.IsNullOrWhiteSpace(dto.Content))
                return BadRequest("Content is required.");

            var entry = new JournalEntry
            {
                UserId = userId.Value,
                Title = _journalEncryption.Encrypt(dto.Title.Trim()),
                Content = _journalEncryption.Encrypt(dto.Content.Trim()),
                CreatedAt = DateTime.UtcNow
            };

            _context.JournalEntries.Add(entry);
            await _context.SaveChangesAsync();

            return Ok(new 
            { 
                id = entry.Id, 
                message = "Journal entry created successfully." 
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var entries = await _context.JournalEntries
                .Where(j => j.UserId == userId)
                .OrderByDescending(j => j.CreatedAt)
                .ToListAsync();

            var upgraded = false;
            foreach (var entry in entries)
            {
                if (!_journalEncryption.IsEncrypted(entry.Title))
                {
                    entry.Title = _journalEncryption.Encrypt(entry.Title);
                    upgraded = true;
                }

                if (!_journalEncryption.IsEncrypted(entry.Content))
                {
                    entry.Content = _journalEncryption.Encrypt(entry.Content);
                    upgraded = true;
                }
            }

            if (upgraded)
                await _context.SaveChangesAsync();

            return Ok(entries.Select(j => new
            {
                j.Id,
                Title = _journalEncryption.Decrypt(j.Title),
                Content = _journalEncryption.Decrypt(j.Content),
                j.CreatedAt,
                j.UpdatedAt
            }));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var entry = await _context.JournalEntries
                .FirstOrDefaultAsync(j => j.Id == id && j.UserId == userId);

            if (entry == null)
                return NotFound("Journal entry not found.");

            return Ok(new
            {
                entry.Id,
                Title = _journalEncryption.Decrypt(entry.Title),
                Content = _journalEncryption.Decrypt(entry.Content),
                entry.CreatedAt,
                entry.UpdatedAt
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, UpdateJournalDto dto)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var entry = await _context.JournalEntries
                .FirstOrDefaultAsync(j => j.Id == id && j.UserId == userId);

            if (entry == null)
                return NotFound("Journal entry not found.");

            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest("Title is required.");

            if (string.IsNullOrWhiteSpace(dto.Content))
                return BadRequest("Content is required.");

            entry.Title = _journalEncryption.Encrypt(dto.Title.Trim());
            entry.Content = _journalEncryption.Encrypt(dto.Content.Trim());
            entry.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Journal entry updated successfully." });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var entry = await _context.JournalEntries
                .FirstOrDefaultAsync(j => j.Id == id && j.UserId == userId);

            if (entry == null)
                return NotFound("Journal entry not found.");

            _context.JournalEntries.Remove(entry);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Journal entry deleted successfully." });
        }

        private int? GetUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return claim != null ? int.Parse(claim) : null;
        }
    }
}
